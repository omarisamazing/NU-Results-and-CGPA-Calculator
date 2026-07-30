# Fix Prompt: Credit Column, Blank CGPA, Exact Toggle Logic

CREDITS ARE VERY LOW. Read code first, make the smallest possible fix, 
verify in preview, then stop. Do not regenerate whole files or components. 
Complete each priority fully before starting the next.

Note: "Coming soon" on most departments in the Calculator is EXPECTED, not a 
bug — only Economics and Accounting currently have real course data loaded. 
Do not spend any credits on this; it's a separate, future data-entry task.

---

## PRIORITY 1 — Credit column is empty, and this is likely also why the CGPA header is blank

Bug: the Credit column shows "–" for every subject on the Lookup/transcript 
page, for every result (both the failed-subject example and the all-passed 
example). The CGPA header box is also completely blank in both cases — no 
number, no toggle, nothing.

These are almost certainly the SAME bug: if credit is empty/0/undefined for 
every course, `computeCGPA` (which divides by `sum(credit)`) produces 
`NaN` or `undefined`, and the header likely fails to render anything rather 
than showing an error. Fix Priority 1 first, then re-check whether the CGPA 
header populates correctly before doing any separate work on it.

Investigate:
1. Where does credit come from for a Lookup/fetched result? Check whether 
   the scraper is trying to parse a "Credit" value directly off NU's result 
   HTML page (unreliable — NU's page may not expose credit per subject in a 
   parseable way).
2. If so, STOP trying to scrape credit. Instead, after parsing the course 
   CODE and GRADE from NU's page, look up that course code in the existing 
   static department dataset (the same JSON/data file the manual Calculator 
   already uses, which has correct credit values per course code). Attach 
   that credit value to the parsed result.
3. If the course code isn't found in the static dataset (e.g. department not 
   yet loaded), fall back to showing "–" for that one row only — don't let 
   one missing course break the whole page.

Verify: reload roll 4057074 (has fails) and roll 4057073 (all passed) — 
Credit column should show real numbers (e.g. 4) for every matched course.

---

## PRIORITY 2 — Exact CGPA display logic (implement precisely as specified)

Required behavior — replace whatever partial version currently exists:

**Case A — All subjects passed (no "Fail" grade present):**
- Show the real overall CGPA immediately, using the shared `computeCGPA` 
  engine, no toggle needed.

**Case B — At least one subject has grade "Fail":**
- Do NOT show a computed overall CGPA number.
- Show a toggle/dropdown for EACH failed subject, letting the user pick a 
  hypothetical replacement grade (any grade other than Fail — D through A+). 
  No default selection.
- Once every failed subject has a hypothetical grade selected, compute and 
  display "Estimated Overall CGPA" using the shared `computeCGPA` engine — 
  substitute each failed course's point with the hypothetical grade's point, 
  keep every other (already-passed) course at its real point.
- This estimate should update live/dynamically if the user changes any 
  toggle afterward — recompute on every change, don't require re-submitting.
- Until all failed subjects have a selection, show no estimate number yet 
  (e.g. a placeholder like "Select a grade for each failed subject to see 
  your estimated CGPA").

Implementation notes:
- This logic must live in ONE shared component used by both the Lookup page 
  and the manual Calculator — do not duplicate it into two copies.
- Fail rows keep red text/badge styling (already working, don't touch).
- Do not touch credit logic, footer, print stylesheet, or department slugs — 
  those are confirmed working or out of scope for this pass.

Verify both cases in preview:
- Roll 4057073 (all passed): real CGPA shows immediately, no toggle UI.
- Roll 4057074 (2 fails): no CGPA number shown initially; two grade 
  dropdowns appear (Intermediate Microeconomics, Mathematical Economics); 
  after selecting a grade for both, an estimated CGPA appears and updates if 
  you change a selection.

---

## Constraints
- Fix Priority 1 completely and re-verify the CGPA header before touching 
  Priority 2 — it may already be mostly fixed as a side effect
- No new features, no visual redesign, no touching working parts (footer, 
  print, department list, point-column fix from last pass)
- Stop cleanly between priorities if credits run low — do not leave a 
  half-applied edit
