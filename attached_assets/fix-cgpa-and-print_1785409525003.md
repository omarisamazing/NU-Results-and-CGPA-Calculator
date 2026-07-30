# Fix Prompt: CGPA Label + Print Stylesheet

Do ONLY the two fixes below. Do not regenerate, refactor, or touch any other 
file, feature, or department data. Do not stop partway — complete both fixes 
fully in this pass before ending.

---

## Fix 1: Clarify the CGPA label when failed subjects exist

Current behavior: the CGPA is computed only from passed (non-F) courses, 
excluding failed subjects from both numerator and denominator. This matches 
NU's own official provisional CGPA method and should NOT change.

What needs to change is only the label, so it's clear this isn't a final 
CGPA:

- In the shared calc engine (`src/lib/gpa.ts` or wherever `computeCGPA` 
  lives), have it return an object like:
  `{ cgpa: number, hasFailedSubjects: boolean }`
  where `hasFailedSubjects` is true if any course in the result has grade "F"

- In the transcript display component, if `hasFailedSubjects` is true, change 
  the label from "COMPUTED CGPA" to "PROVISIONAL CGPA" and add a small note 
  directly under it: "Excludes failed subjects — retake required to finalize"

- If `hasFailedSubjects` is false, keep the label as "COMPUTED CGPA" with no 
  extra note, since it's a complete, final result

Do not change the actual math. Only add the flag and the conditional label/note.

---

## Fix 2: Print should show only the marksheet, not the whole page

Current behavior: clicking "Print Transcript" calls `window.print()`, which 
prints the entire page — search form, buttons, navigation, everything 
currently rendered.

Fix with a print stylesheet:

1. Wrap the marksheet/transcript result section (the card with student name, 
   CODE/SUBJECT/CREDIT/GRADE/POINT table, and CGPA) in a container with a 
   class, e.g. `className="print-area"`

2. Add global CSS (in `index.css` or `globals.css`):
   ```css
   @media print {
     body * {
       visibility: hidden;
     }
     .print-area, .print-area * {
       visibility: visible;
     }
     .print-area {
       position: absolute;
       left: 0;
       top: 0;
       width: 100%;
     }
     .no-print {
       display: none !important;
     }
   }
   ```

3. Add `className="no-print"` to the search form (Query panel), the 
   navigation bar, and any buttons that shouldn't appear in the printed 
   output (except leave the actual content of the print-area alone)

4. Test: clicking "Print Transcript" should now show only the student's name, 
   father's name, college, roll/reg/status, the course table, and the CGPA 
   line — nothing else.

---

## Constraints
- These are the only two changes in this pass
- Do not add new features, do not touch the fetch/scraper logic, do not touch 
  other pages
- Confirm both fixes are complete and working in preview before ending the 
  session
