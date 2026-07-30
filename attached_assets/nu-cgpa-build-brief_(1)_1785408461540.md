# Build Brief: NU Result Fetcher + CGPA Calculator

## 1. Scope of this prototype
- Single-student, on-demand fetch only (no loops, no bulk requests)
- Manual calculator (existing nu-cgpa.vercel.app style) as the reliable fallback
- Auto-fetch as an enhancement layered on top, with graceful degradation if NU's site is slow/down

---

## 2. Grading system (formulas)

**Grade → Grade Point (standard NU scale):**

| Grade | Marks | Grade Point |
|---|---|---|
| A+ | 80-100 | 4.00 |
| A | 75-79 | 3.75 |
| A- | 70-74 | 3.50 |
| B+ | 65-69 | 3.25 |
| B | 60-64 | 3.00 |
| B- | 55-59 | 2.75 |
| C+ | 50-54 | 2.50 |
| C | 45-49 | 2.25 |
| D | 40-44 | 2.00 |
| F | 0-39 | 0.00 |

**Year GPA formula:**
```
Year GPA = Σ(grade_point_i × credit_i) / Σ(credit_i)
```

**Overall CGPA formula (credit-weighted across all years):**
```
CGPA = Σ(all courses' grade_point × credit) / Σ(all courses' credit)
```

**Pass/fail rule:** a course with grade F (0.00) still counts in the credit-weighted average, but the course is not considered completed — flag it internally as `passed: false` for retake logic, even though it isn't shown harshly in the UI.

> Note: F grades and fail status should stay factually visible in the UI (same neutral card style as any other grade, no red/alarm styling) rather than being hidden. Hiding a fail result risks a student missing a retake deadline or misjudging their standing — a real harm for a tool people will trust and act on.

---

## 3. Data model

NU has multiple program types, and each needs its own dataset — course lists, year structure, and even the exam form field values differ between them:

| Program | Typical structure | Notes |
|---|---|---|
| **Honours** | 4 years | Already covered — largest dataset, most departments |
| **Degree (Pass)** | 3 years | Fewer, broader courses per year, no major-specific electives |
| **Masters (Final)** | 1 year (for Honours-holders) | Single year of courses, smaller credit total |
| **Masters (Preliminary + Final)** | 2 years | For Degree-Pass-holders entering Masters; Preliminary year first, then Final |

Same grading scale and GPA/CGPA formulas apply across all of them (Section 2) — only the course list and year count change.

```json
{
  "program": "masters",
  "department": "Economics",
  "syllabus": "2021-2022",
  "years": [
    {
      "year": 1,
      "label": "Masters Final",
      "courses": [
        { "code": "3101", "name": "Advanced Macroeconomics", "credit": 4, "isElective": false, "pairedWith": null }
      ]
    }
  ]
}
```

For elective pairs (mutually exclusive courses), use `pairedWith: "courseCode"` — selecting one disables the other in the UI.

**Structural implication:** key the department JSON by `program + department + syllabus`, not just department — e.g. `economics-honours-2013-2014` and `economics-masters-2021-2022` are separate datasets, since course codes and credits don't carry over between programs even within the same department.

---

## 4. Manual calculator logic

1. Load department JSON on page load (static, no fetch needed)
2. Render each year's courses with grade-selector buttons
3. On grade click: store `{ courseCode: gradePoint }` in state
4. Recompute Year GPA and running CGPA on every state change (pure client-side, instant)
5. Result card per subject: course name, credit, grade — pass/fail styling kept neutral (no red/harsh color for F, same card style, just show the letter grade)

---

## 5. Auto-fetch logic (the NU site integration)

**Exam Name field values to support (dropdown on NU's form):**
- Honours 1st/2nd/3rd/4th Year
- Degree Pass 1st/2nd/3rd Year
- Masters Preliminary
- Masters Final
- Consolidated

**Step-by-step flow:**

1. User enters: Program (Honours / Degree / Masters), Examination Name (mapped from program), Examination Year, Exam Roll, Registration No.
2. Backend `GET https://results.nu.ac.bd/honours` → capture:
   - Session cookie (forward in next request)
   - CAPTCHA question text (regex-parsed, e.g. `/(\d+)\s*\+\s*(\d+)\s*=/`)
   - Any hidden CSRF/form token
3. Backend solves CAPTCHA arithmetic, builds POST payload
4. `POST` same fields + solved CAPTCHA + cookie to the form's action URL
5. Parse response HTML (cheerio) → extract table rows: course code, name, credit, grade
6. Map extracted grades into the same data structure the manual calculator uses
7. Feed into the same GPA/CGPA calculation functions from Section 4 — one shared calculation engine, so manual entry and auto-fetch never diverge in logic

**Resilience — what happens if NU's site is broken:**

| Failure type | Handling |
|---|---|
| Timeout / connection refused | Catch, show: "NU's server is slow right now — you can enter your grades manually below" and auto-switch UI to the manual calculator, pre-selecting the right department/syllabus if known |
| 500/502 error from NU | Same fallback as above |
| CAPTCHA page structure changed (parsing fails) | Catch parse error specifically, log it, same fallback message — don't let a silent failure just spin forever |
| Successful fetch | Cache the parsed result server-side keyed by registration number + exam year, so a repeat visit for the same student never re-hits NU |
| Retry policy | Max 1 automatic retry after a 3s delay on timeout only — never retry-loop aggressively, that adds load to a site that's already struggling |

**Guardrails to keep in the code (non-negotiable even for the prototype):**
- One request per explicit user action — no batching, no cron jobs pulling multiple students
- Log every fetch attempt (timestamp + which reg number) for your own audit trail
- Rate-limit your own endpoint (e.g. 1 request per 5 seconds per IP) so your tool itself can't be misused as a scraping proxy by someone else

---

## 6. Minimal-token Replit prompt (paste this directly)

```
Build a Next.js app with two parts sharing one calculation engine:

PART A — Manual Calculator:
- Static JSON per program+department+syllabus (code, name, credit per course,
  grouped by year). Support three program types: Honours (4 years), Degree
  Pass (3 years), Masters (1 year Final, or 2 years Preliminary+Final)
- Program selector first (Honours / Degree / Masters), then department, then
  syllabus year — each combination loads its own JSON file
- Grade-select UI, click grade → instant Year GPA + overall CGPA using:
  Year GPA = sum(gradePoint * credit) / sum(credit)
  CGPA = sum(all gradePoint * credit) / sum(all credit)
- Grade scale: A+ =4.00, A=3.75, A-=3.50, B+=3.25, B=3.00, B-=2.75, C+=2.50,
  C=2.25, D=2.00, F=0.00
- Neutral styling for all grades including F — no red/alarm styling, same card
  design for every grade

PART B — Auto-fetch (single request only, no loops):
- Map selected program to NU's Exam Name field: Honours 1st-4th Year, Degree
  Pass 1st-3rd Year, Masters Preliminary, Masters Final, Consolidated
- API route: GET https://results.nu.ac.bd/honours, capture session cookie +
  CAPTCHA text via regex, solve arithmetic
- POST exam name/year/roll/reg/captcha answer + cookie to submit
- Parse response with cheerio into the same course/grade structure as Part A
- Feed into the SAME calculation functions from Part A — no duplicate logic
- On any fetch error (timeout, 500, parse failure): catch it, show "NU's
  server is busy — enter your grades manually" and fall back to Part A's UI
- Cache successful fetches by registration number so repeat visits don't
  re-fetch
- Rate limit: max 1 request per 5 seconds per IP, single retry on timeout
  only, log every attempt with timestamp + reg number

Keep it to one shared calc module used by both parts.
```
