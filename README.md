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
# then edit .env.local and add ANTHROPIC_API_KEY (or OPENROUTER_API_KEY — see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Or click **"View a sample
report"** on the homepage to see the full report UI with no key at all — it's
entirely client-side, no server call, no cost.

## Environment variables

The app supports two LLM providers. Set **one** of them — if both are set,
Anthropic (Claude) takes priority.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | **Recommended.** Powers content-type detection, substance/structure/credibility scoring judgment, and the GEO rewrite generation via Claude. Requires billing set up at [console.anthropic.com](https://console.anthropic.com/). |
| `ANTHROPIC_MODEL` | Optional, defaults to `claude-sonnet-5`. |
| `OPENROUTER_API_KEY` | **Free-tier alternative, for testing only.** Routes the same two calls through a free model on [openrouter.ai](https://openrouter.ai/settings/keys) — no billing required. Quality (especially the rewrite) is noticeably lower than Claude, and the report shows a banner whenever this path is used. |
| `OPENROUTER_MODEL` | Optional, defaults to `meta-llama/llama-3.3-70b-instruct:free`. Free models on OpenRouter change over time — if the default stops working, pick a current one from [openrouter.ai/models](https://openrouter.ai/models) (filter: "free"). |

Without either key set, `/api/analyze` returns a clear `missing_api_key`
error — the rest of the pipeline (fetch, content extraction, rules-based
checks) still runs.

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
  4. LLM-powered judgment: content-type detection and substance/structure/
     credibility/freshness scoring + findings, plus the full rewrite
     generation. Provider-agnostic dispatch lives in `src/lib/llm.ts`, with
     implementations in `src/lib/claude.ts` (Anthropic) and
     `src/lib/openrouter.ts` (free-tier testing), sharing prompt templates
     from `src/lib/promptTemplates.ts`.
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
