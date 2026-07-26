# GEO Content Optimizer

Paste a URL (or raw page text), and get back a Generative Engine Optimization
(GEO) audit: an overall score, a weighted breakdown across five scoring
buckets, prioritized findings, a ready-to-publish GEO-optimized rewrite
(Markdown), and an annotated wireframe of the recommended page structure.

See [`GEOOptimizerPRD.md`](./GEOOptimizerPRD.md) for full requirements. This is
the Phase 1 (v1) MVP: single-URL analysis, stateless (no database). Competitor
search ships as a feature-flagged stub (see below). Live-answer AI-engine
testing is out of scope for v1 entirely — not built, not stubbed.

## Getting started

```bash
npm install
cp .env.local.example .env.local
# then edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers content-type detection, substance/structure/credibility scoring judgment, and the GEO rewrite generation. Get one at [console.anthropic.com](https://console.anthropic.com/). |
| `ANTHROPIC_MODEL` | No (defaults to `claude-sonnet-5`) | Override the model used for analysis/rewrite calls. |

Without `ANTHROPIC_API_KEY` set, `/api/analyze` returns a clear
`missing_api_key` error — the rest of the pipeline (fetch, content
extraction, rules-based checks) still runs.

## How it works

- **Frontend:** single-page flow (`src/app/page.tsx`) — URL/paste input →
  loading progress → report view. No routing between steps; state lives in
  React state only (stateless per PRD, nothing persisted server-side).
- **Backend:** one route handler, `src/app/api/analyze/route.ts`, orchestrates:
  1. Fetch the page (`src/lib/fetchPage.ts`), or accept pasted text/HTML as a fallback.
  2. Extract main content via Readability + cheerio (`src/lib/extractContent.ts`).
  3. Rules-based checks: readability score, alt-text/link-text quality, structural
     elements, author/last-updated signals, schema.org matching, AI-crawler
     (robots.txt/llms.txt) accessibility gate (`src/lib/checks/*`).
  4. Claude-powered judgment: content-type detection and substance/structure/
     credibility/freshness scoring + findings, plus the full rewrite generation
     (`src/lib/claude.ts`).
  5. Weighted scoring and a prioritized (tier/impact/effort/owner) action list
     (`src/lib/scoring.ts`).
  6. Stubbed competitor analysis (`src/lib/competitor.ts`) — wired into the
     report shape now so Phase 2 doesn't need a rewrite.
- **Exports:** Markdown download of the rewrite, client-side PDF export of the
  report (`jspdf` + `html2canvas`, no server-side rendering needed).

## Known gaps (by design, for v1)

- No competitor search — needs a search API key (Brave Search / Serper); the
  report shows a placeholder in that section until wired in.
- No accounts, history, or bulk URL analysis (Phase 2/3 per the PRD).
- No live-answer AI-engine testing — decided out of scope for v1 (Phase 2).
