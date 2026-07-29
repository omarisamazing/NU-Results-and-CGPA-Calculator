/**
 * NU Results Scraper
 *
 * Fetches and parses exam results from https://results.nu.ac.bd/honours.
 *
 * IMPORTANT: This module must only ever be invoked by an explicit user
 * action (a form submission). It must never run automatically, on a timer,
 * or in bulk/batch loops.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "./logger";

const BASE_URL = "https://results.nu.ac.bd";
const FORM_URL = `${BASE_URL}/honours`;

export interface CourseResult {
  code: string;
  subject: string;
  grade: string;
  gradePoint: number | null;
}

export interface ScrapedResult {
  studentName: string | null;
  cgpa: number | null;
  courses: CourseResult[];
}

export interface LookupParams {
  examName: string;
  examYear: string;
  roll: string;
  registrationNo: string;
}

/** Safely evaluate a simple "A op B =" arithmetic CAPTCHA without eval(). */
function solveCaptcha(text: string): number {
  const match = text.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)\s*=/);
  if (!match) {
    throw new Error(`Cannot parse CAPTCHA expression: "${text}"`);
  }
  const a = parseInt(match[1], 10);
  const op = match[2];
  const b = parseInt(match[3], 10);
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return Math.floor(a / b);
    default: throw new Error(`Unknown CAPTCHA operator: ${op}`);
  }
}

/** Try multiple cheerio selectors to locate the CAPTCHA arithmetic expression. */
function extractCaptcha($: cheerio.CheerioAPI): string {
  const arithmetic = /\d+\s*[\+\-\*\/]\s*\d+\s*=/;

  const candidates = [
    $("[class*='captcha']").text(),
    $("[id*='captcha']").text(),
    $("label[for*='captcha']").text(),
    $("input[name*='captcha']").closest("div, td, p").text(),
  ];

  for (const c of candidates) {
    const t = c.trim();
    if (arithmetic.test(t)) return t;
  }

  // Fallback: walk all text nodes
  let found = "";
  $("body").find("*").each((_, el) => {
    if (found) return;
    const text = $(el).clone().children().remove().end().text().trim();
    if (arithmetic.test(text)) found = text;
  });

  return found;
}

/**
 * Look up an NU exam result.
 * One request per call — never loop over this function.
 */
export async function lookupNuResult(params: LookupParams): Promise<ScrapedResult> {
  logger.info({ roll: params.roll, examName: params.examName }, "Fetching NU result form");

  // Step 1: GET the search form page and capture the session cookie
  const getResp = await axios.get(FORM_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NU-result-lookup/1.0)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    maxRedirects: 5,
    timeout: 15_000,
  });

  const rawCookies: string[] = (getResp.headers["set-cookie"] as string[] | undefined) ?? [];
  const cookieHeader = rawCookies.map((c) => c.split(";")[0]).join("; ");

  logger.info({ status: getResp.status, hasCookie: cookieHeader.length > 0 }, "Form page fetched");

  // Step 2: Parse form — CAPTCHA text, hidden fields, action URL
  const $ = cheerio.load(getResp.data as string);

  const captchaText = extractCaptcha($);
  if (!captchaText) {
    throw new Error(
      "Could not find CAPTCHA arithmetic expression in the NU results page. " +
      "The site structure may have changed."
    );
  }

  const hiddenFields: Record<string, string> = {};
  $("input[type='hidden']").each((_, el) => {
    const name = $(el).attr("name");
    const value = $(el).attr("value") ?? "";
    if (name) hiddenFields[name] = value;
  });

  const rawAction = $("form").attr("action") ?? FORM_URL;
  const postUrl = rawAction.startsWith("http")
    ? rawAction
    : `${BASE_URL}${rawAction.startsWith("/") ? "" : "/"}${rawAction}`;

  // Step 3: Solve the CAPTCHA
  const captchaAnswer = solveCaptcha(captchaText);
  logger.info({ captchaText, captchaAnswer }, "CAPTCHA solved");

  // Step 4: POST the form
  const formParams = new URLSearchParams();
  for (const [k, v] of Object.entries(hiddenFields)) formParams.append(k, v);
  formParams.append("exam_name", params.examName);
  formParams.append("exam_year", params.examYear);
  formParams.append("roll_number", params.roll);
  formParams.append("reg_number", params.registrationNo);
  formParams.append("captcha", String(captchaAnswer));

  const postResp = await axios.post(postUrl, formParams.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NU-result-lookup/1.0)",
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": FORM_URL,
      "Cookie": cookieHeader,
    },
    maxRedirects: 5,
    timeout: 20_000,
  });

  logger.info({ status: postResp.status }, "Result POST response received");

  // Step 5: Parse the result HTML
  const $r = cheerio.load(postResp.data as string);

  const pageText = $r("body").text();
  if (/no result|not found|invalid roll|invalid registration|error/i.test(pageText)) {
    throw new Error("No result found for the given roll and registration number.");
  }

  // Student name — often in an h2/h3 or strong near the top of results
  let studentName: string | null = null;
  ["h2", "h3", "strong", ".student-name", "#student-name"].forEach((sel) => {
    if (studentName) return;
    const txt = $r(sel).first().text().trim();
    if (txt && txt.length > 2 && txt.length < 100 && !/^\d/.test(txt)) {
      studentName = txt;
    }
  });

  // CGPA
  let cgpa: number | null = null;
  $r("*").each((_, el) => {
    if (cgpa !== null) return;
    const text = $r(el).clone().children().remove().end().text().trim();
    const m = text.match(/CGPA[:\s]+([0-9.]+)/i);
    if (m) cgpa = parseFloat(m[1]);
  });

  // Course rows from a results table
  const courses: CourseResult[] = [];
  $r("table tr").each((i, row) => {
    if (i === 0) return; // skip header
    const cells = $r(row).find("td");
    if (cells.length >= 3) {
      const code = $r(cells[0]).text().trim();
      const subject = $r(cells[1]).text().trim();
      const grade = $r(cells[2]).text().trim();
      const gpText = cells.length >= 4 ? $r(cells[3]).text().trim() : "";
      const gradePoint = gpText && !isNaN(parseFloat(gpText)) ? parseFloat(gpText) : null;
      if (code && subject) {
        courses.push({ code, subject, grade, gradePoint });
      }
    }
  });

  return { studentName, cgpa, courses };
}
