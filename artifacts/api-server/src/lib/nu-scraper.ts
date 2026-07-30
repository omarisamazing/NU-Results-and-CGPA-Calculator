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

// Map human-readable exam names → the numeric codes the NU form uses
export const EXAM_NAME_CODES: Record<string, string> = {
  "Bachelor Degree Honours 1st Year": "2201",
  "Bachelor Degree Honours 2nd Year": "2202",
  "Bachelor Degree Honours 3rd Year": "2203",
  "Bachelor Degree Honours 4th Year": "2204",
  "Bachelor Degree Honours Consolidated Result": "2205",
  "Degree Pass 1st Year": "2301",
  "Degree Pass 2nd Year": "2302",
  "Degree Pass 3rd Year": "2303",
  "Masters Preliminary": "2401",
  "Masters Final": "2402",
};

export const EXAM_NAMES = Object.keys(EXAM_NAME_CODES);

/** Standard NU grading scale — kept here so the scraper can resolve grade points */
const GRADE_POINTS: Record<string, number> = {
  "A+": 4.00,
  "A":  3.75,
  "A-": 3.50,
  "B+": 3.25,
  "B":  3.00,
  "B-": 2.75,
  "C+": 2.50,
  "C":  2.25,
  "D":  2.00,
  "F":  0.00,
};

export interface CourseResult {
  code: string;
  subject: string;
  credit: number | null;
  grade: string;
  gradePoint: number | null;
}

export interface ScrapedResult {
  studentName: string | null;
  fathersName: string | null;
  college: string | null;
  resultStatus: string | null; // e.g. "Promoted", "Failed"
  cgpa: number | null;         // server-provided (consolidated results only)
  computedCGPA: number | null; // calculated from courses
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
  const match = text.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
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

/** Extract the arithmetic CAPTCHA from the NU form page. */
function extractCaptcha($: cheerio.CheerioAPI): string {
  const arithmetic = /\d+\s*[\+\-\*\/]\s*\d+/;

  // Primary: the bold span containing the arithmetic
  const fromBoldSpan = $("span.fw-bold").text().trim();
  if (arithmetic.test(fromBoldSpan)) return fromBoldSpan;

  // Secondary: any span with fs-5
  const fromFs5 = $("span.fs-5").text().trim();
  if (arithmetic.test(fromFs5)) return fromFs5;

  // Fallback: walk all text nodes
  let found = "";
  $("body").find("*").each((_, el) => {
    if (found) return;
    const text = $(el).clone().children().remove().end().text().trim();
    if (arithmetic.test(text)) found = text;
  });

  return found;
}

/** Parse Set-Cookie headers → cookie string for next request. */
function cookiesFromHeaders(headers: Record<string, unknown>): string {
  const raw = headers["set-cookie"];
  const list: string[] = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  return list.map((c) => c.split(";")[0]).join("; ");
}

/** Extract the XSRF-TOKEN value from a cookie string (URL-decoded). */
function xsrfFromCookies(cookieHeader: string): string {
  const m = cookieHeader.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

/** Compute overall CGPA from a list of courses (credit-weighted). */
function computeCGPA(courses: CourseResult[]): number | null {
  const graded = courses.filter(
    (c) => c.gradePoint !== null && c.credit !== null,
  );
  if (graded.length === 0) return null;
  const totalWeighted = graded.reduce(
    (sum, c) => sum + c.gradePoint! * c.credit!,
    0,
  );
  const totalCredits = graded.reduce((sum, c) => sum + c.credit!, 0);
  return totalCredits > 0 ? totalWeighted / totalCredits : null;
}

/**
 * Look up an NU exam result.
 * One request per call — never loop over this function.
 */
export async function lookupNuResult(params: LookupParams): Promise<ScrapedResult> {
  const examCode = EXAM_NAME_CODES[params.examName];
  if (!examCode) {
    throw new Error(`Unknown examination name: "${params.examName}"`);
  }

  logger.info({ roll: params.roll, examName: params.examName, examCode }, "Fetching NU result form");

  // Step 1: GET the search form page — captures session + XSRF cookies
  const getResp = await axios.get(FORM_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    maxRedirects: 5,
    timeout: 15_000,
  });

  const cookieHeader = cookiesFromHeaders(getResp.headers as Record<string, unknown>);
  const xsrfToken = xsrfFromCookies(cookieHeader);

  logger.info({ status: getResp.status, xsrfPreview: xsrfToken.slice(0, 20) + "…" }, "Form page fetched");

  // Step 2: Parse form — CAPTCHA text + hidden CSRF token
  const $ = cheerio.load(getResp.data as string);

  const captchaText = extractCaptcha($);
  if (!captchaText) {
    throw new Error(
      "Could not find CAPTCHA arithmetic expression in the NU results page. " +
      "The site structure may have changed.",
    );
  }

  // The Laravel _token hidden input
  const csrfToken = $("input[name='_token']").attr("value") ?? "";

  const rawAction = $("form").attr("action") ?? FORM_URL;
  const postUrl = rawAction.startsWith("http")
    ? rawAction
    : `${BASE_URL}${rawAction.startsWith("/") ? "" : "/"}${rawAction}`;

  // Step 3: Solve the CAPTCHA
  const captchaAnswer = solveCaptcha(captchaText);
  logger.info({ captchaText, captchaAnswer }, "CAPTCHA solved");

  // Step 4: POST with correct field names (matches the actual NU form)
  const formParams = new URLSearchParams();
  formParams.append("_token", csrfToken);
  formParams.append("examination_name", examCode);
  formParams.append("year", params.examYear);
  formParams.append("examination_roll", params.roll);
  formParams.append("registration_no", params.registrationNo);
  formParams.append("captcha", String(captchaAnswer));

  logger.info({ postUrl }, "Submitting result form");

  const postResp = await axios.post(postUrl, formParams.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": FORM_URL,
      "Cookie": cookieHeader,
      "X-XSRF-TOKEN": xsrfToken,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": BASE_URL,
    },
    maxRedirects: 5,
    timeout: 20_000,
  });

  logger.info({ status: postResp.status }, "Result POST response received");

  // Step 5: Parse the result HTML
  const $r = cheerio.load(postResp.data as string);

  // Detect error / no-result
  const pageText = $r("body").text();
  if (/no result|result not found|not available|invalid roll|invalid registration/i.test(pageText)) {
    throw new Error("No result found for the given roll and registration number.");
  }
  if ($r("title").text().toLowerCase().includes("error")) {
    const errBody = String(postResp.data).slice(0, 300);
    throw new Error(`NU portal returned an error page: ${errBody}`);
  }

  // ── Student info ────────────────────────────────────────────────────────────
  let studentName: string | null = null;
  let fathersName: string | null = null;
  let college: string | null = null;

  $r(".card-body .p-3").each((_, box) => {
    const label = $r(box).find("span.text-muted").first().text().trim().toLowerCase();
    const value = $r(box).find("span.fw-bold, span.fw-semibold").first().text().trim();
    if (!value) return;
    if (label.includes("name of student")) studentName = value;
    else if (label.includes("father")) fathersName = value;
    else if (label.includes("college")) college = value.replace(/^\(\d+\)\s*/, "").trim();
  });

  // ── Result status ────────────────────────────────────────────────────────────
  let resultStatus: string | null = null;
  $r(".fw-bold").each((_, el) => {
    const t = $r(el).text().trim();
    if (/^(promoted|failed|pass|withheld|incomplete|distinction|merit)$/i.test(t)) {
      resultStatus = t;
    }
  });

  // ── CGPA (consolidated results only) ─────────────────────────────────────────
  let cgpa: number | null = null;
  $r("*").each((_, el) => {
    if (cgpa !== null) return;
    const text = $r(el).clone().children().remove().end().text().trim();
    const m = text.match(/CGPA[:\s]+([0-9.]+)/i);
    if (m) cgpa = parseFloat(m[1]);
  });

  // ── Course rows ───────────────────────────────────────────────────────────
  // NU result table columns: Course Code | Title of Course | Credit | Letter Grade
  const courses: CourseResult[] = [];
  $r("table tr").each((_, row) => {
    const cells = $r(row).find("td");
    if (cells.length < 4) return; // skip header rows
    const code       = $r(cells[0]).text().trim();
    const subject    = $r(cells[1]).text().trim();
    const creditText = $r(cells[2]).text().trim();
    const grade      = $r(cells[3]).text().trim();

    if (!code || !/^\d/.test(code)) return; // course codes start with digits

    const credit     = creditText && !isNaN(parseFloat(creditText)) ? parseFloat(creditText) : null;
    const gradePoint = grade in GRADE_POINTS ? GRADE_POINTS[grade] : null;

    courses.push({ code, subject, credit, grade, gradePoint });
  });

  const computedCGPA = computeCGPA(courses);

  return { studentName, fathersName, college, resultStatus, cgpa, computedCGPA, courses };
}
