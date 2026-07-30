# Fix Prompt: Fail-Gated CGPA, Footer Links, Department List

CREDIT BUDGET IS LOW. Complete tasks in this exact priority order. Finish 
each task completely (including a working preview check) before starting the 
next. If credits run out, stop cleanly at the end of whichever task is 
currently in progress — do not leave a task half-edited or the app in a 
broken state.

---

## PRIORITY 1 — Fail-gated CGPA + red fail styling (do this first)

Current behavior: CGPA always displays, even with failed subjects, labeled 
"Provisional CGPA."

New behavior:

1. If `hasFailedSubjects` is true, do NOT show a computed CGPA number by 
   default. Instead show a status block: "You have failed subject(s) — 
   estimate your CGPA below" with a short explanation that this is an 
   estimate assuming those subjects are retaken and passed.

2. Add a lightweight "Estimate CGPA" control: for each failed subject, a 
   dropdown/select to choose a hypothetical grade (A+ through D — no F 
   option, since the point is estimating a passing outcome). Default 
   selection: unselected/placeholder, not pre-picked.

3. Once the user has picked a hypothetical grade for every failed subject, 
   compute and show "Estimated CGPA (if retake passes as selected)" using 
   the SAME shared calc engine — just with the hypothetical grade point 
   substituted for that course's row. Do not fork the calculation logic; 
   pass hypothetical values into `computeCGPA`.

4. If `hasFailedSubjects` is false, behave exactly as now: show the real 
   computed CGPA immediately, no estimate UI.

5. Styling: any row with grade "Fail" gets red text/badge for the grade cell 
   (use the app's existing brand accent color if there's a red/warning 
   variant already defined in the theme; otherwise a standard red, e.g. 
   #DC2626). All other grades keep current neutral styling — do not recolor 
   passing grades.

Test in preview: a result with failed subjects should show the warning block 
and estimate control, not a plain CGPA number. A result with no fails should 
look exactly as it does now.

---

## PRIORITY 2 — Footer contact/social links (cheap, do this second)

Add a simple footer to the app (visible on all pages, excluded from print via 
the existing `no-print` class) with:

- Facebook: https://www.facebook.com/omarisamazing/
- Fiverr: https://www.fiverr.com/omarisamazing
- Phone: +8801856733357
- Email: omarisamazing365@gmail.com

Simple row or stacked layout, small icons or plain text links, matching the 
app's existing minimal style. Do not spend time on elaborate design — 
functional and on-brand is enough.

---

## PRIORITY 3 — Expand department list (only if credits remain)

Note: Masters has NO course data available from any reference source — do 
NOT attempt to build Masters department pages this pass. Leave Masters as-is 
(disabled or "Coming soon") for now.

For Honours and Degree, department NAMES and SLUGS are provided below so no 
scraping/discovery is needed — just add these to the department dropdown 
list. Course-level data (subjects + credits) for each new department still 
needs to be added separately later; for this pass, only add departments that 
you can pair with real course data you already have, or mark the rest as 
"Coming soon" in the dropdown rather than showing a broken empty page.

**Honours department slugs (same list for both syllabus years):**
accounting, anthropology, arabic, bangla, botany, 
biochemistry-and-molecular-biology, chemistry, economics, english, 
environment-science, finance-and-banking, geography-and-environment, 
history, home-economics, islamic-history-and-culture, islamic-studies, 
library-and-information-science, management, marketing, mathematics, 
philosophy, physics, political-science, psychology, sanskrit, social-work, 
sociology, soil-science, statistics, zoology

**Degree Pass department slugs:**
accounting, arabic, bangla-elective, biochemistry-and-molecular-biology, 
botany, chemistry, computer-science, drama-and-media-studies, economics, 
english-elective, finance-and-banking, geography-and-environment, history, 
home-economics, islamic-history-and-culture, islamic-studies, 
library-and-information-science, management, marine-engineering, 
marine-fisheries, marketing, mathematics, b-music, nautical, pali, 
philosophy, physics, political-science, psychology, sanskrit, social-work, 
sociology, soil-science, b-sports, statistics, zoology

If credits are too low to safely finish this section, skip it entirely and 
stop after Priority 2 — do not start it and leave it half-done.

---

## Constraints
- Do not touch the fetch/scraper logic, print stylesheet, or any file not 
  related to these three tasks
- Do not regenerate existing department data that already works
- Confirm each priority's change in preview before moving to the next
