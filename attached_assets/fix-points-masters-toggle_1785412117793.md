# Fix Prompt: Point Column Bug, Masters Leak, Missing Estimate Toggle

CREDITS ARE VERY LIMITED. Do NOT regenerate or rewrite whole files. Find the 
exact root cause of each bug first (read the relevant code, don't guess), 
then make the smallest possible edit to fix it. Complete each numbered item 
fully and verify in preview before moving to the next. Stop cleanly if 
credits run out — never leave a half-applied edit.

---

## PRIORITY 1 — Point column shows "4.00" for every grade (critical, fix first)

Bug: on the Lookup/transcript result page, every course's Point column shows 
4.00 regardless of actual grade (C, C+, B-, D, Fail — all show 4.00). This 
happens for both failed AND passed-only results, so it's a general rendering 
or mapping bug, not related to the fail-gating feature.

Investigate:
1. Find the component that renders the course table row (Point column) — 
   likely a `TranscriptTable` or `ResultRow` component
2. Check whether it's correctly looking up each course's OWN grade point 
   (matching that row's grade letter via the grade→point map) versus 
   accidentally referencing a single shared/incorrect value (e.g. a 
   `maxPoint` constant, the last computed value in a loop, or a variable that 
   isn't being re-assigned per row)
3. Confirm the grade→point map itself is correct: A+ =4.00, A=3.75, 
   A-=3.50, B+=3.25, B=3.00, B-=2.75, C+=2.50, C=2.25, D=2.00, F=0.00 (F/Fail 
   should render as "—" in the Point column, not 0.00 or 4.00)
4. Fix only the specific line(s) causing every row to read the same value. 
   This is very likely a one-variable bug (e.g. using a loop variable outside 
   its scope, or a `.map()` returning a fixed value instead of `course.point`)

Verify: reload the same result (roll 4057074) and confirm Political 
Organization shows C→2.25, Sociology shows C+→2.50, Fail rows show "—", 
Introduction to Business shows B→3.00, etc. — each row must differ correctly.

---

## PRIORITY 2 — Masters shows departments that shouldn't exist

Bug: selecting "Masters Final (1 Year)" in the Calculator shows "Economics" 
and "English" as selectable (not "Coming soon"), even though no Masters 
course data exists anywhere in this project.

Investigate:
1. Find where department data is filtered/mapped per program in 
   `Calculator.tsx` or `departments.ts`
2. Check if Masters is accidentally reusing the Honours or Degree department 
   array (or reusing whichever departments happen to have real course data — 
   Economics and Accounting — without checking which PROGRAM that data 
   belongs to)

Fix: Masters should show every department as "Coming soon" / disabled — 
zero selectable departments — since there is no real Masters course data. 
Confirm this doesn't affect Honours or Degree Pass (Accounting and Economics 
should stay selectable there, everything else "Coming soon," exactly as 
before).

---

## PRIORITY 3 — No estimate-CGPA toggle appears after fetching a result

Bug: the fail-gated CGPA estimate control (dropdown per failed subject, 
A+ through D, computing an estimated CGPA) was added to the manual 
Calculator flow (Home.tsx) but does NOT appear on the Lookup/auto-fetch 
result page, even when the fetched result has failed subjects.

Investigate:
1. Check whether the Lookup page renders results through a DIFFERENT 
   component than the Calculator, meaning the fail-gating logic only exists 
   in one place
2. If so, move the fail-gating logic (the `hasFailedSubjects` check, the 
   red-styled Fail rows, and the hypothetical-grade dropdown + estimated CGPA 
   calculation) into the SHARED result-display component both pages already 
   use — do not duplicate the logic into a second copy in the Lookup page

Verify: fetch the same result (roll 4057074, which has 2 failed subjects) — 
confirm the estimate block and per-subject grade dropdowns now appear, and 
that picking grades computes a live estimated CGPA, matching what's already 
working in the manual Calculator.

---

## Constraints
- Do not touch the footer, print stylesheet, or the department slug lists — 
  those are confirmed working
- Prefer fixing the root cause in the shared component over patching each 
  page separately — that's both cheaper in credits and prevents this same 
  bug from splitting into two versions again
- Confirm each priority in preview before starting the next
