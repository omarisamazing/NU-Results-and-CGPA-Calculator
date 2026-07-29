'use strict';

/**
 * NU Honours Result Scraper — proof of concept
 *
 * IMPORTANT: This script must ONLY be triggered by an explicit user action
 * in the final product. Never call it automatically, on a schedule, or in
 * bulk/batch mode. It is a one-request-at-a-time prototype.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// ─── Test constants — change these to a real roll/reg before running ──────────
const TEST_EXAM_NAME       = 'Bachelor Degree Honours 4th Year';
const TEST_EXAM_YEAR       = '2023';
const TEST_ROLL            = '1234567';
const TEST_REGISTRATION_NO = '1234567890';
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL  = 'https://results.nu.ac.bd';
const FORM_URL  = `${BASE_URL}/honours`;

/** Safely evaluate a simple "A op B =" arithmetic expression without eval(). */
function solveCaptcha(text) {
  // Expected formats: "20 + 8 =", "15 - 3 =", "4 * 6 =", "12 / 4 ="
  const match = text.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)\s*=/);
  if (!match) {
    throw new Error(`Cannot parse CAPTCHA expression: "${text}"`);
  }
  const a  = parseInt(match[1], 10);
  const op = match[2];
  const b  = parseInt(match[3], 10);

  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return Math.floor(a / b);
    default:  throw new Error(`Unknown operator: ${op}`);
  }
}

async function main() {
  // ── Step 0: intentional 2-second delay ──────────────────────────────────
  // This delay acts as a soft rate-limit guard. In the final product this
  // whole function should only ever fire on an explicit button press by the
  // user — never on a timer, never in a loop.
  console.log('[0] Waiting 2 seconds before sending any request …');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ── Step 1: GET the search form page ────────────────────────────────────
  console.log(`[1] GET ${FORM_URL}`);
  const getResp = await axios.get(FORM_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NU-result-prototype/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    withCredentials: true,
    maxRedirects: 5,
  });
  console.log(`[1] Response status: ${getResp.status}`);

  // Extract session cookie(s) from the response headers
  const rawSetCookie = getResp.headers['set-cookie'] || [];
  const cookieHeader = rawSetCookie
    .map(c => c.split(';')[0])   // keep only name=value, drop attributes
    .join('; ');
  console.log(`[1] Cookies received: ${cookieHeader || '(none)'}`);

  // ── Step 2: Parse the HTML ───────────────────────────────────────────────
  console.log('[2] Parsing HTML …');
  const $ = cheerio.load(getResp.data);

  // Find the CAPTCHA question — typically inside a label or span near the
  // captcha input. Common selectors used by this site; extend as needed.
  let captchaText = '';
  const captchaCandidates = [
    $('[class*="captcha"]').text(),
    $('[id*="captcha"]').text(),
    $('label[for*="captcha"]').text(),
    // sometimes it's plain text next to an input named "captcha"
    $('input[name*="captcha"]').closest('div, td, p').text(),
  ];
  for (const candidate of captchaCandidates) {
    const trimmed = candidate.trim();
    if (/\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(trimmed)) {
      captchaText = trimmed;
      break;
    }
  }
  // Fallback: scan all visible text nodes for an arithmetic pattern
  if (!captchaText) {
    $('body').find('*').each((_, el) => {
      if (captchaText) return; // already found
      const text = $(el).clone().children().remove().end().text().trim();
      if (/\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(text)) {
        captchaText = text;
      }
    });
  }
  console.log(`[2] CAPTCHA text found: "${captchaText || '(not found)'}"`);

  // Extract hidden fields
  const hiddenFields = {};
  $('input[type="hidden"]').each((_, el) => {
    const name  = $(el).attr('name');
    const value = $(el).attr('value') || '';
    if (name) {
      hiddenFields[name] = value;
    }
  });
  console.log('[2] Hidden fields:', hiddenFields);

  // Locate the form's action URL
  const formAction = $('form').attr('action') || FORM_URL;
  const postUrl    = formAction.startsWith('http')
    ? formAction
    : `${BASE_URL}${formAction.startsWith('/') ? '' : '/'}${formAction}`;
  console.log(`[2] Form action URL: ${postUrl}`);

  // ── Step 3: Solve the CAPTCHA ────────────────────────────────────────────
  if (!captchaText) {
    throw new Error(
      'Could not locate CAPTCHA expression in the page. ' +
      'The site structure may have changed — inspect the HTML and update the selectors.'
    );
  }
  const captchaAnswer = solveCaptcha(captchaText);
  console.log(`[3] CAPTCHA solved: "${captchaText}" → ${captchaAnswer}`);

  // ── Step 4: POST the form ────────────────────────────────────────────────
  // Build form-encoded body
  const params = new URLSearchParams();

  // Spread hidden fields first (CSRF token, session field, etc.)
  for (const [key, val] of Object.entries(hiddenFields)) {
    params.append(key, val);
  }

  // Known field names from NU's form — adjust if the site uses different names
  params.append('exam_name',   TEST_EXAM_NAME);
  params.append('exam_year',   TEST_EXAM_YEAR);
  params.append('roll_number', TEST_ROLL);
  params.append('reg_number',  TEST_REGISTRATION_NO);
  params.append('captcha',     String(captchaAnswer));

  console.log(`[4] POST ${postUrl}`);
  console.log(`[4] Payload fields: ${[...params.keys()].join(', ')}`);

  const postResp = await axios.post(postUrl, params.toString(), {
    headers: {
      'User-Agent':     'Mozilla/5.0 (compatible; NU-result-prototype/1.0)',
      'Content-Type':   'application/x-www-form-urlencoded',
      'Referer':        FORM_URL,
      'Cookie':         cookieHeader,
    },
    maxRedirects: 5,
  });
  console.log(`[4] POST response status: ${postResp.status}`);

  // ── Step 5: Parse the results HTML ───────────────────────────────────────
  console.log('[5] Parsing result HTML …');
  const $r = cheerio.load(postResp.data);

  // Check for an error/no-result message
  const pageText = $r('body').text();
  if (/no result|not found|invalid|error/i.test(pageText)) {
    console.warn('[5] Page appears to contain an error or no-result message.');
  }

  // Extract course rows from a results table
  const courses = [];
  $r('table tr').each((i, row) => {
    if (i === 0) return; // skip header row
    const cells = $r(row).find('td');
    if (cells.length >= 3) {
      const code    = $r(cells[0]).text().trim();
      const subject = $r(cells[1]).text().trim();
      const grade   = $r(cells[2]).text().trim();
      if (code && subject) {
        courses.push({ code, subject, grade });
      }
    }
  });

  // Try to find CGPA — often in a dedicated cell or paragraph
  let cgpa = null;
  $r('*').each((_, el) => {
    if (cgpa !== null) return;
    const text = $r(el).clone().children().remove().end().text().trim();
    const m = text.match(/CGPA[:\s]+([0-9.]+)/i);
    if (m) {
      cgpa = parseFloat(m[1]);
    }
  });

  const result = {
    examName:       TEST_EXAM_NAME,
    examYear:       TEST_EXAM_YEAR,
    roll:           TEST_ROLL,
    registrationNo: TEST_REGISTRATION_NO,
    cgpa,
    courses,
  };

  // ── Step 6: Output ───────────────────────────────────────────────────────
  console.log('\n[6] Result JSON:');
  console.log(JSON.stringify(result, null, 2));

  return result;
}

main().catch(err => {
  console.error('[ERROR]', err.message);
  if (err.response) {
    console.error('  HTTP status:', err.response.status);
    console.error('  Response snippet:', String(err.response.data).slice(0, 500));
  }
  process.exit(1);
});
