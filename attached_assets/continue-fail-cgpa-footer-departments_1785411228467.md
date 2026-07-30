# Continuation Prompt: Resume Fail-Gated CGPA, Footer, Departments

The previous session ran out of credits mid-edit. Before changing anything, 
READ the current state of these files to see exactly what's already done vs 
still pending — do not blindly re-apply edits, since some are likely already 
in place and duplicating them will break the build.

**Files to inspect first, in this order:**
1. `Home.tsx` — check if `hypotheticalGrades` state exists, whether the CGPA 
   block already has fail-gating logic, and whether F-grade rows already have 
   red styling
2. `Shell.tsx` — check if the footer with contact links was already added
3. `departments.ts` — check if the full expanded department list already 
   exists (it was reportedly created new in the prior session)
4. `Calculator.tsx` — check current handling of departments that don't have 
   course data yet (this was left unfixed when credits ran out)

Once you know what's actually done, complete ONLY what's missing from the 
checklist below. Finish each numbered item fully, verify in preview, before 
moving to the next. If credits run out again, stop cleanly at the end of 
whichever item is in progress — never leave a half-applied edit.

---

## Checklist (complete only what's still missing)

### 1. Home.tsx — fail-gated CGPA + estimate control
- [ ] `hypotheticalGrades` state exists (tracks a user-selected hypothetical 
  grade per failed course)
- [ ] If any course has grade "F": do NOT show a plain computed CGPA. Show a 
  status block: "You have failed subject(s) — estimate your CGPA below," 
  plus a dropdown per failed subject (grades A+ through D, no F option, no 
  default pre-selected)
- [ ] Once every failed subject has a hypothetical grade selected, compute 
  "Estimated CGPA (if retake passes as selected)" using the SAME shared calc 
  engine (`computeCGPA` / `computeYearGPA`) — pass hypothetical grade points 
  in, don't fork the math into a separate function
- [ ] If no failed subjects: behave exactly as before — real CGPA shown 
  immediately, no estimate UI
- [ ] Any table row with grade "Fail" has red text/badge on the grade cell 
  (use the app's existing red/warning theme color if one exists, otherwise 
  #DC2626). All other grades keep current neutral styling.

### 2. Shell.tsx — footer contact links
- [ ] Footer visible on all pages, excluded from print (`no-print` class), 
  containing:
  - Facebook: https://www.facebook.com/omarisamazing/
  - Fiverr: https://www.fiverr.com/omarisamazing
  - Phone: +8801856733357
  - Email: omarisamazing365@gmail.com
- [ ] Simple layout matching existing app style — no elaborate design needed

### 3. departments.ts — expanded department list
- [ ] Confirm full Honours + Degree Pass department slugs are present (see 
  full list below for reference/verification)
- [ ] Masters is NOT included — no course data exists for Masters anywhere; 
  leave it disabled/"Coming soon," do not attempt to build it

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

### 4. Calculator.tsx — handle departments without course data (unfinished, 
   was in progress when credits ran out)
- [ ] For any department in the dropdown that doesn't have real course/credit 
  data loaded yet, show it as disabled with a "Coming soon" label instead of 
  letting the user select it into a broken/empty calculator page
- [ ] Departments that DO have real course data should work exactly as now

---

## Constraints
- Do not touch fetch/scraper logic, print stylesheet, or any file unrelated 
  to these four items
- Do not regenerate anything that's already confirmed working
- Confirm each item in preview before moving to the next
- If something looks already half-implemented and unclear, prefer reading 
  the full function/component before editing it, rather than guessing
