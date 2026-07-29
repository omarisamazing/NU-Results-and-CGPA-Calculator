import { Router, type IRouter } from "express";
import {
  LookupResultBody,
  LookupResultResponse,
  ListExamNamesResponse,
} from "@workspace/api-zod";
import { lookupNuResult, EXAM_NAMES } from "../lib/nu-scraper";

const router: IRouter = Router();

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

  try {
    const scraped = await lookupNuResult({ examName, examYear, roll, registrationNo });

    const result = LookupResultResponse.parse({
      examName,
      examYear,
      roll,
      registrationNo,
      studentName: scraped.studentName,
      cgpa: scraped.cgpa,
      courses: scraped.courses,
    });

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "NU result lookup failed");

    if (message.includes("No result found")) {
      res.status(404).json({ error: message });
      return;
    }

    // Network / parsing failures
    res.status(502).json({ error: `NU portal error: ${message}` });
  }
});

export default router;
