# Continuation Prompt: Resume Credit Lookup + Shared CGPABlock Refactor

The previous session ran out of credits MID-EDIT, with an active runtime 
error. Do not start new work — first get the app back to a working state, 
then finish the specific pieces left incomplete.

---

## STEP 0 — Fix the crash first (do this before anything else)

Known issue: `Home.tsx` still has an old inline fail-gate block referencing 
`hypotheticalGrades`, `setHypotheticalGrades`, and `estimatedCGPA` that was 
supposed to be removed and replaced by the new shared `<CGPABlock>` 
component, but the removal was incomplete when credits ran out. This is 
currently causing a runtime error (stale reference).

1. Open `Home.tsx` and find every remaining reference to 
   `hypotheticalGrades`, `setHypotheticalGrades`, `estimatedCGPA`, and any 
   leftover inline CGPA/fail-gate JSX block
2. Remove that old inline block entirely and confirm `<CGPABlock>` (from the 
   newly created `CGPABlock.tsx`) is rendered in its place, passed whatever 
   props it needs (courses with grade+point+credit, `hasFailedSubjects`, etc.)
3. Get the app running with no console/runtime errors before touching 
   anything else

---

## STEP 1 — Verify/finish the credit lookup wiring

What was already built: `courseCredits.ts` — a utility that loads the static 
department JSON files (same files/pattern used by `loadDepartmentData` in 
`departments.ts`) and builds a `Map<courseCode, credit>` for lookups, since 
NU's scraped HTML doesn't reliably expose a credit column.

Check:
1. Is `courseCredits.ts` actually being called from `Home.tsx` to enrich the 
   fetched course list (attaching real credit per course code) before 
   `computeCGPA` runs?
2. Since the JSON files are fetched at runtime (async), confirm there's a 
   loading guard — the app should wait for the credit map to be ready before 
   computing/displaying CGPA, not race ahead with empty credits. A simple 
   `isLoading` state around the fetch is enough; don't over-engineer this.
3. For any course code not found in the static dataset, that row shows "–" 
   for credit only — it must not break the whole page or block CGPA 
   calculation for the other, matched courses.

## STEP 2 — Fix the credit cell display in Home.tsx (was mid-edit, failed)

The last attempted edit to show the looked-up credit value in the course 
table row failed because the search text didn't match exactly (whitespace/ 
indentation mismatch). Before retrying:
1. Open `Home.tsx` fresh and view the EXACT current text of the credit table 
   cell (don't reuse old text from memory/history)
2. Make the edit against that exact current text: the cell should render the 
   credit value from the enriched course object (from Step 1's lookup), 
   falling back to "–" only if genuinely not found

## STEP 3 — Confirm CGPABlock.tsx implements the exact required logic

`CGPABlock.tsx` was created as the single shared component for both 
`Home.tsx` (Lookup/fetch results) and `Calculator.tsx` (manual entry). 
Confirm it implements this precisely:

**Case A — All subjects passed (no "Fail" grade present):**
- Show the real overall CGPA immediately via the shared `computeCGPA` 
  engine, no toggle.

**Case B — At least one subject has grade "Fail":**
- Do NOT show a computed overall CGPA number by default.
- Show a dropdown per failed subject: hypothetical replacement grade (D 
  through A+, no Fail option), no default selection.
- Once EVERY failed subject has a selection, compute and show "Estimated 
  Overall CGPA" — substitute each failed course's point with its selected 
  hypothetical grade's point, keep all other real course points as-is, using 
  the same shared `computeCGPA` engine (no forked math).
- Recompute live if the user changes any selection afterward.
- Until all failed subjects have a selection, show a placeholder like 
  "Select a grade for each failed subject to see your estimated CGPA," not 
  an error or blank space.

Confirm both `Home.tsx` and `Calculator.tsx` render `<CGPABlock>` with no 
leftover duplicate/inline CGPA logic in either file.

---

## STEP 4 — Verify in preview (only after Steps 0–3 are done)

- Roll 4057073 (all passed): real CGPA shows immediately, Credit column 
  shows real numbers, no toggle UI
- Roll 4057074 (2 fails: Intermediate Microeconomics, Mathematical 
  Economics): Credit column shows real numbers, no CGPA number shown 
  initially, two grade dropdowns appear, estimated CGPA appears and updates 
  correctly once both are selected
- Manual Calculator (Economics or Accounting, Honours): same CGPABlock 
  behavior for both all-pass and has-fail scenarios

---

## Constraints
- Do not touch footer, print stylesheet, department slug lists, or the 
  point-column grade→point mapping — all confirmed working from prior passes
- Do not create a second version of the credit lookup or CGPA logic — one 
  shared implementation only
- Read exact current file contents before every edit — do not reuse 
  old/remembered text, since multiple edits have already been applied 
  and failed on stale text matches
- Stop cleanly at the end of whichever step is in progress if credits run 
  out again — leave no partial/stale references behind
