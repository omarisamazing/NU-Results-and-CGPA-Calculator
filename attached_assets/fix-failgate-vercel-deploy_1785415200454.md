# Fix Prompt: Fail-Gate CGPA (final) + Vercel-Ready Deploy

Two priorities. Finish Priority 1 completely and verify it in preview before 
starting Priority 2 — a broken CGPA calculation shouldn't ship even if the 
deploy setup is ready.

---

## PRIORITY 1 — CGPA still shows for failed students (fix for real this time)

Current bug: the Lookup page shows "COMPUTED CGPA 2.81" even though 2 
subjects are "Fail." This means either `<CGPABlock>` isn't actually being 
rendered on this page, or its fail-detection check isn't matching.

Do this diagnostically, don't guess:

1. Open the Lookup result page component (`Home.tsx`) and confirm 
   `<CGPABlock>` is the component actually rendering the "COMPUTED CGPA" box 
   in the screenshot. If a different/older inline CGPA block is still being 
   rendered instead, remove it and render `<CGPABlock>` in its place.

2. Inside `CGPABlock.tsx`, check EXACTLY how it detects a failed subject. It 
   must check the actual grade string being used in the data — confirm 
   whether parsed results use the literal string `"Fail"` (capital F, as 
   shown in the UI) or something else like `"F"`. The check must match 
   whatever string is actually in the data, e.g.:
   ```
   const hasFailedSubjects = courses.some(c => c.grade === "Fail");
   ```
   Do not assume — read the actual course object being passed in and match 
   its real grade value.

3. Confirm the conditional render logic is correct:
   ```
   {hasFailedSubjects 
     ? <FailToggleEstimator courses={courses} /> 
     : <RealCGPA value={computeCGPA(courses)} />}
   ```
   If `hasFailedSubjects` is true, the "COMPUTED CGPA" number must NOT 
   render at all — only the toggle UI should show.

4. Confirm the toggle UI itself exists and renders: one dropdown per failed 
   subject (grades D through A+, no default selection), and only after 
   every failed subject has a selection does an "Estimated CGPA" number 
   appear, computed via the shared `computeCGPA` with hypothetical points 
   substituted for the failed rows.

Verify in preview with roll 4057074 (2 fails): no CGPA number on load, two 
dropdowns appear for Intermediate Microeconomics and Mathematical Economics, 
selecting both shows a working, updating estimated CGPA. Then verify roll 
4057073 (all passed) still shows the real CGPA immediately with no toggle.

---

## PRIORITY 2 — Make the project deployable on Vercel, no Replit dependency

Goal: `git clone` + deploy to Vercel should work with zero Replit-specific 
setup.

1. **Remove Replit-specific packages/config:**
   - Remove any `@replit/vite-plugin-*` packages from `package.json` and 
     their usage in `vite.config.ts`
   - Remove `.replit` and `replit.nix` files if present (they're harmless to 
     leave but not needed — fine to delete for a clean repo)
   - Remove any Replit dev-banner script tags or Replit-specific 
     environment checks in the code

2. **Check the API/backend structure:**
   - If the scraper/lookup API currently runs as a separate long-running 
     Express-style server (not serverless functions), it will NOT work as-is 
     on Vercel — Vercel needs serverless functions under an `/api` directory 
     (each file exports a handler), not a persistent server process
   - Convert existing API routes (the NU lookup/scrape endpoint) into Vercel 
     serverless function format: one file per route under `/api`, each 
     exporting a default handler function `(req, res) => {...}`
   - Preserve all existing logic (CAPTCHA solve, cheerio parsing, caching, 
     rate limiting) — this is a structural move, not a rewrite

3. **Environment/config:**
   - Add a `vercel.json` only if needed (e.g. custom rewrites for API 
     routes) — check Vercel's defaults first, don't add config that isn't 
     required
   - Add a `.env.example` listing any environment variables the project 
     needs (if none currently used, skip this)
   - Confirm `package.json` has a standard `build` script that Vercel can 
     run out of the box (Vite default: `vite build`)

4. **Test the build locally** (`npm run build`) and confirm no Replit-only 
   imports or paths break it before considering this done.

---

## Constraints
- Do not touch footer, print stylesheet, department slug lists, credit 
  lookup, or point-column logic — all confirmed working
- Priority 1 must be verified working in preview before starting Priority 2
- If credits run low mid-Priority-2, stop after completing the Replit-removal 
  step (1) even if the serverless conversion (2) isn't finished — a project 
  with Replit deps removed but not yet serverless-converted is a safer 
  stopping point than a half-converted API
