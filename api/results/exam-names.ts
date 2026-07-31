/**
 * GET /api/results/exam-names
 *
 * Vercel serverless function — returns the list of supported examination names.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { EXAM_NAMES } from "../lib/scraper";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  return res.status(200).json(EXAM_NAMES);
}
