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

/**
 * Static course credit lookup — extracted from the same JSON dataset used by
 * the Calculator. NU's result HTML does not reliably expose a credit column,
 * so we look up by course code here rather than trusting the scraped value.
 * All entries are credit 4 except the two 8-credit practicals below.
 */
const COURSE_CREDITS: Record<string, number> = {
  "1101": 4, "1102": 4, "1103": 4, "1104": 4, "1105": 4, "1106": 4,
  "1201": 4, "1202": 4, "1203": 4, "1204": 4, "1205": 4, "1206": 4,
  "1301": 4, "1302": 4, "1303": 4, "1304": 4, "1305": 4, "1306": 4,
  "2101": 4, "2102": 4, "2103": 4, "2104": 4, "2105": 4, "2106": 4,
  "2201": 4, "2202": 4, "2203": 4, "2204": 4, "2205": 4, "2206": 4,
  "2301": 4, "2302": 4, "2303": 4, "2304": 4, "2305": 4, "2306": 4, "2307": 4,
  "2401": 4, "2402": 4, "2403": 4, "2404": 4, "2405": 4, "2406": 4, "2407": 4,
  "3101": 4, "3102": 4, "3103": 4, "3104": 4, "3105": 4, "3106": 4,
  "3201": 4, "3202": 4, "3203": 4, "3204": 4, "3205": 4, "3206": 4,
  "3301": 4, "3302": 4, "3303": 4, "3304": 4, "3305": 4, "3306": 4, "3307": 4,
  "3401": 4, "3402": 4, "3403": 4, "3404": 4, "3405": 4, "3406": 4, "3407": 4,
  "3501": 4, "3502": 4, "3503": 4, "3504": 4, "3505": 4, "3506": 4, "3507": 4, "3508": 4, "3509": 8,
  "3601": 4, "3602": 4, "3603": 4, "3604": 4, "3605": 4, "3606": 4, "3607": 4, "3608": 4, "3609": 8,
  "4101": 4, "4102": 4, "4103": 4, "4104": 4, "4105": 4, "4106": 4,
  "4201": 4, "4202": 4, "4203": 4, "4204": 4, "4205": 4, "4206": 4,
  "4301": 4, "4302": 4, "4303": 4, "4304": 4, "4305": 4, "4306": 4, "4307": 4,
  "4401": 4, "4402": 4, "4403": 4, "4404": 4, "4405": 4, "4406": 4, "4407": 4,
  "5101": 4, "5102": 4, "5103": 4, "5104": 4, "5105": 4, "5106": 4,
  "5201": 4, "5202": 4, "5203": 4, "5204": 4, "5205": 4, "5206": 4,
  "5301": 4, "5302": 4, "5303": 4, "5304": 4, "5305": 4, "5306": 4, "5307": 4,
  "5401": 4, "5402": 4, "5403": 4, "5404": 4, "5405": 4, "5406": 4, "5407": 4,
  "6101": 4, "6102": 4, "6103": 4, "6104": 4, "6105": 4, "6106": 4,
  "6201": 4, "6202": 4, "6203": 4, "6204": 4, "6205": 4, "6206": 4,
  "6301": 4, "6302": 4, "6303": 4, "6304": 4, "6305": 4, "6306": 4, "6307": 4,
  "6401": 4, "6402": 4, "6403": 4, "6404": 4, "6405": 4, "6406": 4, "6407": 4,
  "7101": 4, "7102": 4, "7103": 4, "7104": 4, "7105": 4, "7106": 4,
  "7201": 4, "7202": 4, "7203": 4, "7204": 4, "7205": 4, "7206": 4,
  "7301": 4, "7302": 4, "7303": 4, "7304": 4, "7305": 4, "7306": 4, "7307": 4,
  "7401": 4, "7402": 4, "7403": 4, "7404": 4, "7405": 4, "7406": 4, "7407": 4,
  "8101": 4, "8102": 4, "8103": 4, "8104": 4, "8105": 4, "8106": 4,
  "8201": 4, "8202": 4, "8203": 4, "8204": 4, "8205": 4, "8206": 4,
  "8301": 4, "8302": 4, "8303": 4, "8304": 4, "8305": 4, "8306": 4, "8307": 4,
  "8401": 4, "8402": 4, "8403": 4, "8404": 4, "8405": 4, "8406": 4, "8407": 4,
  "9101": 4, "9102": 4, "9103": 4, "9104": 4, "9105": 4, "9106": 4,
  "9201": 4, "9202": 4, "9203": 4, "9204": 4, "9205": 4, "9206": 4,
  "9301": 4, "9302": 4, "9303": 4, "9304": 4, "9305": 4, "9306": 4,
  "9401": 4, "9402": 4, "9403": 4, "9404": 4, "9405": 4, "9406": 4,
  "9501": 4, "9502": 4, "9503": 4, "9504": 4, "9505": 4, "9506": 4,
  "9601": 4, "9602": 4, "9603": 4, "9604": 4, "9605": 4, "9606": 4,
};

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

    // Prefer the scraped credit value; fall back to the static lookup.
    // NU's result HTML doesn't reliably expose a credit column.
    const scrapedCredit = creditText && !isNaN(parseFloat(creditText)) ? parseFloat(creditText) : null;
    const credit = scrapedCredit ?? COURSE_CREDITS[code] ?? null;
    const gradePoint = grade in GRADE_POINTS ? GRADE_POINTS[grade] : null;

    courses.push({ code, subject, credit, grade, gradePoint });
  });

  const computedCGPA = computeCGPA(courses);

  return { studentName, fathersName, college, resultStatus, cgpa, computedCGPA, courses };
}
