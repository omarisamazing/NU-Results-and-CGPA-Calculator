# NU Results and CGPA Calculator

A web app for looking up National University of Bangladesh (NU) exam results and computing CGPA — built to be faster and friendlier than checking results manually on NU's official portal, without replacing it as the source of truth.

**Live site:** [nuresultscalculator.vercel.app](https://nuresultscalculator.vercel.app)

---

## What it does

- **Result lookup** — fetches a student's result directly from NU's official portal (`results.nu.ac.bd`) by simulating the same form submission a browser would make, then parses the returned HTML into structured JSON.
- **CGPA calculator** — lets students manually enter course grades and credits to calculate their CGPA, independent of a live result lookup. Useful for planning "what-if" scenarios before results are published.
- Supports Honours (1st–4th year, Consolidated), Degree Pass (1st–3rd year), and Masters Preliminary exam types.

---

## Project structure

This is a pnpm workspace monorepo. The two parts that matter for the deployed app are:

```
├── api/                          → Vercel serverless functions (the backend)
│   ├── healthz.ts                    GET  /api/healthz
│   ├── lib/scraper.ts                Scraping + HTML parsing logic (self-contained, no shared deps)
│   └── results/
│       ├── exam-names.ts             GET  /api/results/exam-names
│       └── lookup.ts                 POST /api/results/lookup
│
├── artifacts/nu-results/         → React/Vite frontend (the UI)
│   ├── src/
│   │   ├── App.tsx                   Router entry (wouter)
│   │   ├── pages/Home.tsx            Result lookup + fail-gate logic
│   │   ├── pages/Calculator.tsx      Manual CGPA calculator
│   │   ├── components/CGPABlock.tsx  Shared CGPA display component
│   │   └── lib/
│   │       ├── gpa.ts                CGPA math (the actual grade point engine)
│   │       ├── departments.ts        Program/department registry
│   │       └── courseCredits.ts      Client-side credit map builder
│   └── public/
│       ├── data/*.json               Static course/credit definitions per program
│       ├── robots.txt
│       └── sitemap.xml
│
├── lib/                           → Shared workspace packages
│   ├── db/                            Drizzle ORM schema (Postgres) — used by other artifacts, not the deployed calculator
│   ├── api-zod/                       Generated Zod validators from the OpenAPI spec
│   ├── api-client-react/              Generated React Query hooks from the OpenAPI spec
│   └── api-spec/openapi.yaml          Source-of-truth API spec
│
├── vercel.json                    Deployment config: build command, rewrites, CORS/cache headers
└── pnpm-workspace.yaml             Workspace package list + shared dependency catalog
```

> Other folders (`artifacts/api-server`, `artifacts/mockup-sandbox`, `nu-scraper`, `scripts`) are earlier iterations or dev tooling from the Replit build process and aren't part of the live Vercel deployment.

---

## How result fetching works

NU's portal (`results.nu.ac.bd`) is a Laravel web app, not a public API. `api/lib/scraper.ts` simulates a real browser session:

1. **GET** the relevant form page (`/honours`, `/degree`, or `/masters`) to get a CSRF token, session cookie, and a simple math CAPTCHA (e.g. `"13 + 6 ="`), which is solved with a regex — no `eval()`.
2. **POST** the search form with the exam code, year, roll, registration number, and solved CAPTCHA, forwarding the cookie and CSRF token from step 1.
3. **Parse** the returned HTML (via `cheerio`) to extract student info, pass/fail status, the course table, and CGPA (when present).

Exam type → NU form URL mapping, and other supported exam codes, are documented as comments in `api/lib/scraper.ts`.

**Not supported:** Revaluation, Professional, and College-wise results — these use separate NU portals with different session mechanics.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, wouter (routing), TanStack React Query, Tailwind CSS |
| Backend | Vercel Serverless Functions (TypeScript) |
| Scraping | `axios` + `cheerio` |
| Validation | `zod` |
| Package management | pnpm workspaces with a shared dependency catalog |
| Hosting | Vercel (static frontend + serverless API, single deployment) |

---

## Local development

```bash
# Install dependencies (pnpm required — see preinstall script)
pnpm install

# Run the frontend dev server
pnpm --filter @workspace/nu-results dev
```

The API functions (`api/*.ts`) are written for the Vercel runtime. To test them locally, use the [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm install -g vercel
vercel dev
```

---

## Deployment

Deployed on Vercel directly from this repo's `main` branch. `vercel.json` at the repo root defines everything Vercel needs:

- **Build command:** builds only the `nu-results` frontend package
- **Output directory:** `artifacts/nu-results/dist/public`
- **Rewrites:** SPA fallback to `index.html` for all non-`/api/*` routes
- **Headers:** CORS for `/api/*`, long-lived caching for static assets

When importing this repo into a new Vercel project:

- **Framework Preset:** `Other`
- **Root Directory:** `.` (repo root — don't point it at a subfolder)
- **Build / Output / Install Command:** leave blank — `vercel.json` provides all of them
- **Environment Variables:** none required

**Known limitation:** rate-limiting and result caching are in-memory in earlier iterations of the API, but Vercel serverless functions are stateless per-invocation, so this doesn't apply to the deployed `api/` functions as they stand. NU's own portal rate-limits naturally, which is sufficient at the scale of students checking their own results. For high-concurrency use, add [Vercel KV](https://vercel.com/docs/storage/vercel-kv) for shared state.

---

## SEO

`public/robots.txt` and `public/sitemap.xml` are checked into the frontend's public folder and served as static files. If you fork this project or move it to your own domain, update both files with your actual domain before submitting to Google Search Console — they must reference the domain the app is actually hosted on.

---

## Disclaimer

This is an independent, unofficial tool. It is not affiliated with or endorsed by National University, Bangladesh. Always treat `results.nu.ac.bd` as the authoritative source for official results.

---

## License

MIT
