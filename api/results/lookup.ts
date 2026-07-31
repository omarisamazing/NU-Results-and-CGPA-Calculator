/**
 * POST /api/results/lookup
 *
 * Vercel serverless function — fetches a student's result from NU's portal.
 * Must only be called from an explicit user action; never in a loop or batch.
 *
 * NOTE: In-memory rate-limiting and caching are not used here because Vercel
 * serverless functions are stateless (each invocation is a fresh process).
 * For production scale, add Vercel KV (free tier) for distributed state.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { lookupNuResult, EXAM_NAME_CODES } from "../lib/scraper";

const RequestSchema = z.object({
  examName:       z.string().min(1),
  examYear:       z.string().min(4).max(4),
  roll:           z.string().min(1),
  registrationNo: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body: " + parsed.error.message });
  }

  const { examName, examYear, roll, registrationNo } = parsed.data;

  if (!EXAM_NAME_CODES[examName]) {
    return res.status(400).json({ error: `Unknown examination name: "${examName}"` });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? "unknown";
  console.log("[lookup] attempt", { ip, registrationNo, examYear, examName, ts: new Date().toISOString() });

  try {
    const scraped = await lookupNuResult({ examName, examYear, roll, registrationNo });

    const result = {
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
    };

    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[lookup] failed:", message);

    if (message.includes("No result found")) {
      return res.status(404).json({ error: message });
    }

    return res.status(502).json({
      error:
        "NU's server is slow or unavailable right now. " +
        "You can enter your grades manually using the calculator.",
    });
  }
}
