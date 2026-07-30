import { Router, type IRouter, type Request } from "express";
import {
  LookupResultBody,
  LookupResultResponse,
  ListExamNamesResponse,
} from "@workspace/api-zod";
import { lookupNuResult, EXAM_NAMES } from "../lib/nu-scraper";

const router: IRouter = Router();

// ── In-memory rate limiter (1 request per 5 s per IP) ─────────────────────────
const ipTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 5_000;

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

// ── In-memory result cache (by registrationNo + examYear) ─────────────────────
// Only cache successful fetches so repeat visits never re-hit NU.
// TTL: 1 hour — stale after that so re-fetching is cheap.
interface CacheEntry {
  data: unknown;
  cachedAt: number;
}
const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1_000; // 1 hour

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/results/exam-names", async (_req, res): Promise<void> => {
  res.json(ListExamNamesResponse.parse(EXAM_NAMES));
});

/**
 * POST /results/lookup
 *
 * Must only be triggered by an explicit user action — never in a loop or
 * automated batch. One request per invocation.
 */
router.post("/results/lookup", async (req, res): Promise<void> => {
  const parsed = LookupResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { examName, examYear, roll, registrationNo } = parsed.data;

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const lastTime = ipTimestamps.get(ip) ?? 0;
  const elapsed = Date.now() - lastTime;
  if (elapsed < RATE_LIMIT_MS) {
    const remaining = Math.ceil((RATE_LIMIT_MS - elapsed) / 1_000);
    req.log.warn({ ip }, "Rate limited");
    res.status(429).json({
      error: `Please wait ${remaining} second${remaining !== 1 ? "s" : ""} before trying again.`,
    });
    return;
  }

  // Stamp before the request so concurrent requests from the same IP also block
  ipTimestamps.set(ip, Date.now());

  // ── Audit log (non-negotiable per brief) ──────────────────────────────────
  req.log.info(
    { ip, registrationNo, examYear, examName, timestamp: new Date().toISOString() },
    "NU result lookup attempt",
  );

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cacheKey = `${registrationNo}:${examYear}`;
  const cached = resultCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    req.log.info({ cacheKey }, "Returning cached result");
    res.json(cached.data);
    return;
  }

  // ── Scrape ────────────────────────────────────────────────────────────────
  try {
    const scraped = await lookupNuResult({ examName, examYear, roll, registrationNo });

    const result = LookupResultResponse.parse({
      examName,
      examYear,
      roll,
      registrationNo,
      studentName:  scraped.studentName,
      fathersName:  scraped.fathersName,
      college:      scraped.college,
      resultStatus: scraped.resultStatus,
      cgpa:         scraped.cgpa,
      computedCGPA: scraped.computedCGPA,
      courses:      scraped.courses,
    });

    // Store in cache on success
    resultCache.set(cacheKey, { data: result, cachedAt: Date.now() });

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "NU result lookup failed");

    if (message.includes("No result found")) {
      res.status(404).json({ error: message });
      return;
    }

    // Network / parsing / CAPTCHA failures
    res.status(502).json({
      error:
        "NU's server is slow or unavailable right now. " +
        "You can enter your grades manually using the calculator.",
    });
  }
});

export default router;
