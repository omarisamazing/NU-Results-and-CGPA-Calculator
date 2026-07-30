# NU Results — CGPA Calculator

A two-part tool for National University Bangladesh students: auto-fetch results from the NU portal, and a manual CGPA calculator as the reliable fallback. Both parts share one calculation engine so GPA math is never duplicated.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/nu-results run dev` — run the frontend (port 25931)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + shadcn/ui + framer-motion + wouter
- API: Express 5
- Scraping: axios + cheerio (NU results portal)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod validators (do not edit)
- `artifacts/api-server/src/lib/nu-scraper.ts` — NU portal scraper (CAPTCHA solver, HTML parser)
- `artifacts/api-server/src/routes/results.ts` — rate limiter + result cache + scraper integration
- `artifacts/nu-results/src/lib/gpa.ts` — **shared GPA/CGPA calculation engine** (used by both parts)
- `artifacts/nu-results/src/lib/departments.ts` — department registry and data loader
- `artifacts/nu-results/public/data/` — static JSON course data per department+program
- `artifacts/nu-results/src/pages/Home.tsx` — auto-fetch result viewer (Part B)
- `artifacts/nu-results/src/pages/Calculator.tsx` — manual CGPA calculator (Part A)

## Architecture decisions

- **One shared calculation engine** (`gpa.ts`) — `computeYearGPA` and `computeCGPA` are used by both the manual calculator and the auto-fetch result display. No duplicate logic.
- **Grade point is computed from letter grade** — the NU portal returns letter grades; the scraper converts them to numeric points using the standard NU scale (A+=4.00 … F=0.00). The credit value is also captured separately.
- **Static JSON for course data** — department course lists live in `public/data/` as static files fetched at runtime. Add a new JSON file + registry entry to support a new department; no rebuild needed.
- **In-memory rate limiting** — 1 request per 5 seconds per IP, enforced in the Express route before any scraping. Resets on server restart; acceptable for a prototype.
- **In-memory result cache** — successful fetches are cached 1 hour by `registrationNo:examYear` key to avoid re-hitting the NU portal on repeated lookups.
- **Max 1 retry on timeout** — the scraper does not retry-loop. One explicit retry after 3 s on timeout only; all other errors surface immediately.
- **F grades show neutrally** — no red/alarm styling for failed courses. Same card design for every grade, per NU's recommendation to keep the display factual.

## Product

**Part A — Manual Calculator** (`/calculator`):
- Select Program (Honours 4yr / Degree Pass 3yr / Masters Final 1yr), then Department, then Syllabus year
- All courses for that program load from a static JSON file
- Click a grade button (A+, A, A−, B+, B, B−, C+, C, D, F) for each course
- Year GPA and overall CGPA update instantly in real time
- Elective pairs are mutually exclusive — selecting one disables the other
- Reset button clears all grades

**Part B — Auto-fetch** (`/`):
- Select exam name + enter year, roll, registration number → fetch from NU portal
- Backend solves arithmetic CAPTCHA, POSTs form, parses result HTML with cheerio
- Courses returned with credit + letter grade + grade point
- Client computes CGPA using the shared engine (shown if server CGPA is null)
- On any failure: shows "NU's server is slow" message + link to manual calculator
- Rate limited (1 req/5s/IP) + results cached (1hr) server-side

## Supported departments (data files)

**Honours (4yr):** Economics, English, Accounting, Political Science, Mathematics, History, Management
**Degree Pass (3yr):** Economics, Accounting, Management
**Masters Final (1yr):** Economics, English

## User preferences

_None recorded yet._

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before using the generated hooks.
- The `results-parser/` directory is a legacy copy of this project. Its workflows will fail (port conflict) — this is expected. Ignore it.
- The NU portal CAPTCHA is arithmetic-only (addition, subtraction, multiplication). If it changes to image-based, the scraper will throw a parse error and gracefully fall back to the manual calculator UX.
- Do NOT add `pnpm -r run dev` to the root — individual artifact workflows manage their own PORT and BASE_PATH env vars.
