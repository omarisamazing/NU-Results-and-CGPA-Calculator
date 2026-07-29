import { Router, type IRouter } from "express";
import {
  LookupResultBody,
  LookupResultResponse,
  ListExamNamesResponse,
} from "@workspace/api-zod";
import { lookupNuResult } from "../lib/nu-scraper";

const router: IRouter = Router();

/** Static list of NU examination names. */
const EXAM_NAMES = [
  "Bachelor Degree Honours 1st Year",
  "Bachelor Degree Honours 2nd Year",
  "Bachelor Degree Honours 3rd Year",
  "Bachelor Degree Honours 4th Year",
  "Master of Arts (MA) Preliminary",
  "Master of Arts (MA) Final",
  "Master of Science (MS) Preliminary",
  "Master of Science (MS) Final",
  "Master of Social Science (MSS) Preliminary",
  "Master of Social Science (MSS) Final",
  "Master of Commerce (MCom) Preliminary",
  "Master of Commerce (MCom) Final",
];

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
