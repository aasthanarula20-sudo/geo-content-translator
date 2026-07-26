# Product Requirements Document
## GEO Content Optimizer

**Version:** 1.1 (Draft)
**Date:** July 26, 2026
**Status:** Internal Testing → Potential Public Launch

---

## 1. Overview

### 1.1 Problem
Content visibility is shifting from traditional search rankings to citations inside AI-generated answers (ChatGPT, Perplexity, Google AI Overviews, Gemini, Copilot). Most content — and most content creators — are still optimized for old-style SEO (keywords, backlinks) rather than for how large language models read, parse, and decide whether to cite a page. There's no simple, fast way to check a single page's "GEO-readiness" and get concrete fixes.

### 1.2 Solution
A tool that takes a single URL, analyzes it against GEO best practices (content structure, technical markup, competitive positioning), and produces two core deliverables: (1) a fully rewritten, GEO-optimized version of the page as a ready-to-use markdown file, and (2) an annotated wireframe showing the recommended structure and CTA placement. A supporting scored findings report explains the reasoning behind the rewrite.

### 1.3 Goals
- **Primary:** Validate internally that automated GEO analysis produces genuinely useful, actionable recommendations (not generic SEO advice relabeled).
- **Secondary:** Build the tool on an architecture that can scale to bulk analysis, live AI-engine citation testing, accounts, and history without a rewrite.

### 1.4 Non-Goals (v1)
- No video content generation (explicitly out of scope — this is a text/content GEO tool, not a video tool).
- No bulk URL processing (planned for Phase 2).
- No live AI-engine citation testing of any kind — not built, not stubbed, not feature-flagged. Deferred entirely to Phase 2, once there's budget for paid AI-engine API access (see 4.2.1 and 6).
- No user accounts, login, or saved history (deferred until ship decision is made).

---

## 2. Target User

- **v1:** Internal use — the founder/team testing the tool on their own or client content.
- **Future:** Marketing agencies, in-house content/marketing teams, and solo creators who need to know whether their content is likely to be surfaced and cited by AI answer engines.

**Where to start testing:** not all content benefits equally from GEO. Definitions, comparisons, FAQs, glossaries, and product pages are the formats AI models most reliably reproduce, making them the best pages to run through the tool first during internal validation — they'll show the clearest before/after signal.

---

## 3. Core User Flow

```
[Paste URL] → [Fetch & Analyze] → [View Report] → [Export PDF]
```

1. User lands on a single input screen and pastes a URL.
2. User clicks "Analyze."
3. App fetches the live page, runs it through content, technical, and competitive analysis.
4. App displays a full report (score + breakdown + checklist + rewrites).
5. User can export the report as a PDF.

---

## 4. Functional Requirements

### 4.1 Input Screen
| Requirement | Detail |
|---|---|
| Input field | Single text field accepting a URL |
| Validation | Must be a valid, reachable URL; show inline error if fetch fails (404, blocked, timeout) |
| Trigger | "Analyze" button; disabled until valid URL is entered |
| Loading state | Multi-step progress indicator: Fetching page → Analyzing content → Checking technical factors → Finding competitors → Generating report |

### 4.2 Analysis Engine

**Content-type detection (runs first).** Not every page should be scored against the same template — a comparison guide, a glossary entry, and a narrative blog post have different natural shapes, and forcing FAQ/Q&A structure onto content that isn't naturally Q&A produces worse content, not better GEO. Before scoring, the engine classifies the page into one of a few types (definition/glossary, comparison, FAQ/support, product/pricing, narrative/editorial, local business) and adjusts which checks apply and how heavily structural checks are weighted. E.g. a narrative blog post isn't penalized for lacking a comparison table; a product page is checked more heavily on pricing clarity than a glossary entry would be.

**How AI reads a page.** Per the course framework, generative engines process content through a simple flow: **Find → Read → Reason → Respond**. Every scoring bucket below maps to a step in that flow — Find (can the page even be located/parsed), Read (is it structured for extraction), Reason (does it contain checkable, attributable facts), Respond (would an engine feel safe quoting it).

**Scoring weights.** The overall GEO Score is a weighted composite across five on-page buckets, informed by both external GEO research and the course's field-tested framework:

| Bucket | Weight | What it measures |
|---|---|---|
| **Content substance & answer units** | 35% | Claim → Context → Evidence → Takeaway structure; checkable data over vague claims; evidence placed beside the claim it supports |
| **Topic match & preferred structures** | 20% | Executive definition up top, question-shaped headings, numbered steps, comparison tables, mini-FAQ — does the page use the structures AI is built to extract |
| **Entity clarity & credibility layer** | 20% | Canonical entity names defined on first mention, consistent terminology site-wide, real author with credentials, organization details, visible "last updated," and a scope/watch-outs line |
| **Freshness & fan-out coverage** | 15% | Visible dates and update cadence; whether the page sits within a broader topic cluster (fan-out) or stands alone |
| **Technical/schema** | 10% | Article/FAQPage/HowTo/etc. schema correctly matched to visible content, with stable IDs and about/mentions entity modeling |
| **Off-page/entity authority** | flagged, not scored | Brand mentions, backlinks, reviews elsewhere on the web — outside what a single-URL analysis can measure or fix |

This weighting directly shapes what the report and rewrite prioritize: content-substance and structure fixes are the headline recommendations; schema fixes are real but secondary.

**A. Content Analysis (rules-based, v1)**
Checks the page against the course's on-page signal checklist:
- Executive definition present near the top (2–3 sentences, direct answer to the core question)
- Content packaged as answer units: **Claim** (the fact) → **Context** (why it varies/applies) → **Evidence** (source) → **Takeaway** (what to do with it) — this is the actual writing template the app checks for and rewrites into
- Entities defined on first mention: canonical name, 1–2 sentence definition, consistent capitalization, link to a credible source
- Preferred structures present: question-shaped headings, numbered steps for procedures, comparison tables with fixed criteria, mini-FAQ (3–5 tight Q&As)
- Inline sources placed immediately next to the claim they support (not a disconnected reference list)
- Reading level within an 8th–10th grade range (a safe zone for both human and AI comprehension; checked with a standard readability score)
- Internal links use descriptive text ("explore the feature breakdown," not "click here") — gives both readers and AI more semantic clarity
- **Images/visuals:** alt text is descriptive of content, not decorative ("bar chart comparing monthly user growth across three pricing tiers," not "chart.png"); any insight shown only in a chart or image is also stated in nearby text, since AI can't interpret images directly
- Anti-patterns flagged: walls of text under generic headings, claims without citations, keyword-stuffed paragraphs, multiple names for the same entity, outdated facts (prices/rules/timelines), and content that reads as written only for AI (robotic, generic, no natural voice) rather than for the human reader first

**B. Credibility & Entity Analysis (rules-based, v1)**
- Author box: real name, 2–3 line credential, link to a professional profile (flags boilerplate "Admin" or no-author pages)
- Organization details present (address/contact for local business pages)
- "Last updated" date visible, with a change note if material facts changed
- Disclosure/scope line: what the page covers and doesn't, including watch-outs for sensitive topics
- Content-protection cues where relevant: disclaimers for sensitive/regulated content ("not legal advice," "for informational purposes only"), usage-rights or licensing statements if the content should be cited but not copied wholesale
- Entity consistency check: same canonical names and terms used across the page (and ideally the site)

**C. Technical Analysis (rules-based, v1)**
- **AI crawler accessibility (checked first — a gate, not just a score input):** does `robots.txt` block known AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, etc.)? Is an `llms.txt` file present? A page that blocks AI crawlers can score well on everything else and still never be seen — this is flagged prominently, separate from the weighted score, since it can invalidate the rest of the analysis.
- Matches schema type to actual visible page content rather than applying schema generically:
  - **Article/BlogPosting** — base type for most pages; author, publisher, dates, `about` (primary entity) and `mentions` (secondary entities)
  - **FAQPage** — only if the page visibly shows Q&A pairs
  - **HowTo** — only if the page shows verb-led numbered steps
  - **LocalBusiness** — for clinics/storefronts (address, geo, hours)
  - **Product/Offer/AggregateRating** — only for priced plans/products
  - **BreadcrumbList** — site architecture context
- Stable `@id`s for the article, author, and organization so they can be referenced consistently across pages
- Flags schema that doesn't match visible content ("don't mark up what isn't there — it erodes trust")

**D. Competitive Analysis (v1)**
- Identify 2–3 other pages currently ranking/cited for the same core topic (via search)
- Compare structural approach: how do they front-load answers, structure FAQs, model entities, etc., differently from the analyzed page
- Highlight specific gaps: "Competitor X answers the core question in the first sentence; your page introduces it after 3 paragraphs of context."
- **v1 status:** ships as a placeholder in the report — no search API is wired in yet (see 9, open question on automatic vs. user-specified competitor selection). The rest of the report works independently of this section, per the fallback rule in 5.1.

### 4.2.1 Live-Answer Testing — deferred to Phase 2 (not built for v1)
An earlier draft of this PRD proposed shipping a capped, manual-trigger before/after live-answer test in v1's codebase (built but switched off by default, pending paid AI-engine API access). **That plan was reconsidered and dropped.** For v1, live-answer testing is not built, not stubbed, and not feature-flagged — it does not exist in the codebase at all.

Rationale: it was the single biggest cost driver being considered for v1, and the team decided not to carry even the disabled scaffolding until there's a concrete plan (and budget) for paid AI-engine API access. Revisit this in Phase 2 as a fresh scoping exercise rather than flipping on dormant code — see 6 and 7.

### 4.3 The Three Outputs, At a Glance
Every analysis produces three connected pieces:

1. **Report (dashboard)** — score, bucket breakdown, and prioritized action list. Explains *why* and *how much it matters*.
2. **Wireframe** — visual structural layout. Shows *where* content should go on the page.
3. **Rewrite (markdown file)** — the actual new page copy, ready to implement. Shows *what* to paste in.

The report is the diagnosis; the wireframe and rewrite are the prescription. All three are generated together from a single URL submission and linked from the report screen.

### 4.3.1 Report Output
Single scrollable report page, structured top to bottom:

1. **Header** — URL analyzed, timestamp, Overall GEO Score (large, prominent)
2. **Score Breakdown** — the five weighted buckets (Content substance & answer units / Topic match & structures / Entity clarity & credibility / Freshness & fan-out / Technical schema), shown as bars or numbers matching the weights in 4.2
3. **Content Findings** — list of specific issues found, each with:
   - What's wrong (plain language)
   - Why it matters for GEO (one line)
4. **Entity & Credibility Findings** — checklist style (pass/fail/warning) for author box, org details, last-updated, scope line, entity consistency
5. **Technical Findings** — checklist style (pass/fail/warning) for schema type match, stable IDs
6. **Competitive Findings** — short comparison against 2–3 competitor pages with specific structural gaps called out (placeholder in v1 — see 4.2.D)
7. **Prioritized Action List** (see 4.3.2) — every recommendation from the report and rewrite, ranked by impact and ease of deployment
8. **Links to the two deliverables below** (rewritten page + wireframe) — the report explains *why*, the deliverables show *what*

### 4.3.2 Recommendation Prioritization Framework
This is the core organizing logic for every suggestion the app produces — in the report, the rewrite, and the wireframe. Every recommendation is tagged with three things so a team can act immediately without guessing what to do first:

| Tag | Values | Purpose |
|---|---|---|
| **Bucket** | Content substance & answer units / Topic match & structures / Entity clarity & credibility / Freshness & fan-out / Technical schema | Ties the fix back to the weighting table in 4.2, so it's clear how much it actually matters |
| **Impact** | High / Medium / Low | A directional signal of how much this fix likely moves the GEO Score, based on the bucket weighting in 4.2 — not a precise point prediction, since actual impact varies by page and can't be guaranteed in advance |
| **Deployment effort** | Copy-only / Content team / Design change / Dev required | Who has to touch it to ship it — this is what determines "how fast can this go live." Copy-only means a pure text edit anyone can paste into the CMS with no dev or design involvement. |
| **Suggested owner** | Writer/SME · Content architect · Schema owner · Editor/ops | Maps each fix to the course's GEO team roles, so it's clear who picks it up even without a formal handoff process |

**Recommendations are sorted by a simple priority order: highest score impact + lowest deployment effort first.** In practice, that means:

1. **Quick wins (ship today, copy-only, owner: Writer/SME):** Rewriting content into answer units (claim/context/evidence/takeaway), adding an executive definition up top, fixing entity names to be consistent, adding inline sources next to claims. These sit in the 35%-weighted Content substance and 20%-weighted Topic match buckets, and require no dev or design involvement.
2. **Fast follows (content team, still no dev/design, owner: Content architect + Editor/ops):** Adding a mini-FAQ, comparison table, author box with real credentials, "last updated" date and change note. Still copy-level changes, slightly more editorial effort.
3. **Lower priority (dev required, owner: Schema owner):** Matching schema type to content, adding stable IDs, about/mentions entity modeling. These sit in the 10%-weighted Technical bucket — real, but the smallest score impact, and the only tier where the app should expect tech-team involvement.
4. **Flagged, not actionable via this tool:** Off-page/entity authority (backlinks, brand mentions, reviews). Called out in the report as context, not included in the action list, since it isn't something a page rewrite can fix.

This means the report's top-line action list will almost always lead with tier-1 items — the ones your team can implement immediately with zero dependency on tech or design — before ever surfacing a schema or dev-required fix.

### 4.4 Core Deliverable: GEO-Optimized Page Rewrite
Rather than only pointing out problems, the app produces a complete, ready-to-use rewritten version of the page, optimized for GEO from the ground up. Every change embedded in the rewrite traces back to a tier in the prioritization framework above — the rewrite itself is essentially tier 1 and tier 2 recommendations already implemented, ready to paste live.

**Format:** Markdown file, structured as the actual new page content — not advice about the page.

**Contents of the markdown file** — follows the course's page anatomy exactly:
- **Executive definition** — 2–3 sentences at the top, direct answer to the core question
- **Structured element** — numbered steps for procedures, or a comparison table with fixed criteria, whichever fits the topic
- **Answer units** for each supporting claim, written in the Claim → Context → Evidence → Takeaway pattern (e.g. "Most adult clear-aligner plans in Austin run ≈$3,000–$5,500. Cost varies by case complexity and refinements. [Source]. Aligners can fit a budget when spread over monthly payments.")
- **Entities defined on first mention** — canonical name, 1–2 sentence definition, link to a credible source, used consistently for the rest of the page
- **Mini-FAQ** — 3–5 tight Q&As anticipating natural follow-up questions
- **Credibility layer** — author box (real name + credential + profile link), organization details if applicable, "last updated" date with a change note, and a scope/watch-outs line
- **Contextual CTAs** placed at natural decision points in the content (not just top/bottom banners) — each CTA's placement and copy included inline
- **Suggested schema block** (as a comment or appendix) — the specific schema type matched to the content (Article/FAQPage/HowTo/etc.) plus stable ID and about/mentions guidance, per 4.2.C
- Inline priority tags (as markdown comments) on major changes — e.g. `<!-- Tier 1 · Content substance · High impact · Copy-only · Owner: Writer/SME -->` — so whoever implements the page can see at a glance which edits are highest-impact, lowest-effort, and whose job it is

**This file is meant to be directly usable** — copy-paste-ready for a content team to implement, not a list of suggestions.

**Guardrail:** the rewrite is checked against its own over-optimization risk before being delivered. Content written only for AI reads as robotic and generic and loses human readers — the priority order is always human clarity first, AI-extractability second. If the source page's natural format doesn't fit a technique (e.g. a narrative post doesn't need a forced FAQ block), the rewrite skips it rather than shoehorning it in, per the content-type detection in 4.2.

### 4.5 Core Deliverable: Wireframe
A visual layout representation of the rewritten page, showing structure at a glance — separate from the markdown copy itself.

**Contents (in order, matching the course's page anatomy):**
1. Executive definition block — above the fold, labeled "must answer the query directly"
2. Structured element — steps list or comparison table, whichever fits
3. Answer unit blocks — one per supporting claim, each labeled Claim/Context/Evidence/Takeaway
4. Contextual CTA — placed at a natural decision point, not a generic banner
5. Mini-FAQ block — 3–5 Q&A pairs, schema-ready
6. Credibility layer — author box, org details, last-updated stamp, scope line
7. Closing CTA
8. Schema/metadata appendix note

Each block is annotated with *why* it's placed where it is (e.g. "Executive definition — must appear above the fold so it can be lifted as a standalone answer").

**Format:** Rendered inline in-app (SVG/HTML wireframe view); optionally exportable as an image alongside the PDF report.

### 4.6 Export
- **Report:** PDF (score + findings, as in 4.3)
- **Rewritten page:** Markdown file (.md) download — the primary deliverable
- **Wireframe:** Inline visual in-app; optional image export
- **Trigger:** Separate export/download actions for each of the three outputs, all accessible from the report screen

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Full analysis should complete in under 30 seconds for a typical page |
| Reliability | See Fallback Handling below |
| Statelessness (v1) | No database required — each analysis is a fresh session; nothing persisted between visits |
| Scalability path | Architecture should not block adding: bulk URL input, accounts, saved history, live AI-engine testing in later phases |

### 5.1 Fallback Handling
Several steps in the pipeline can partially fail without the whole report failing — the app should degrade gracefully rather than block:

| Failure | Fallback |
|---|---|
| URL won't fetch (404, paywall, JS-heavy, blocked) | Let the user paste raw text/HTML instead of dead-ending |
| Content-type detection is ambiguous | Default to the generic Article template rather than guessing wrong |
| No clear competitors found | Skip the competitive section, don't block the rest of the report |
| Page too thin to meaningfully score readability/answer-units | Flag "insufficient content" rather than forcing a misleading score |
| Schema type doesn't cleanly match any listed type | Default to base Article/BlogPosting rather than inventing a mismatch |

---

## 6. Out of Scope / Deferred Decisions

These were explicitly left open in planning and should be revisited once the internal test proves the core concept works:

- **Accounts/login** — not needed for v1; revisit once deciding whether to open access beyond internal testing
- **History/tracking over time** — not needed for v1; revisit alongside the accounts decision (tracking requires a logged-in user or persistent identifier). Recurring re-audits (Phase 3, per section 7) build directly on this once it exists.
- **Bulk URL analysis** — planned Phase 2
- **Live AI-engine citation testing (any form)** — fully deferred to Phase 2, including the capped, manual-trigger before/after version originally scoped for v1. Not present in the v1 codebase in any form (no flag, no stub). Revisit as a fresh scoping exercise once there's a concrete budget for paid AI-engine API access — see 7.

---

## 7. Suggested Build Phases

**Phase 1 — MVP (this document's scope)**
- Single URL input, fetch, rules-based content + entity/credibility + technical scoring, search-based competitor comparison
- Findings report (score + reasoning), PDF export
- Full GEO-optimized page rewrite (markdown export), built on the answer-unit template — the core deliverable
- Annotated wireframe (in-app visual, optional image export)
- Stateless — no backend database
- **No live-answer testing in any form** (moved fully to Phase 2 — see 6)

**Phase 2**
- Bulk URL support
- Live AI-engine citation testing (ChatGPT/Perplexity/etc.) — re-scoped from scratch, starting with a manual before/after test (3 prompts, 1 engine, capped) before considering ongoing/full-scale monitoring

**Phase 3 (only if shipping publicly)**
- User accounts
- Saved report history and score tracking over time
- Recurring re-audits — periodic re-test of a page against its own saved baseline (monthly or on-demand), comparing GEO Score and (once Phase 2 ships) live-answer deltas over time. Depends on the accounts/history decision above, which is why it sits here rather than in v1.
- Possible monetization/plan tiers

---

## 8. Suggested Tech Approach

Given the goal of a **polished internal tool built to last** (not a throwaway prototype), the recommended approach is a proper web app rather than a one-off script:

- **Frontend:** React-based single-page app (Next.js full-stack — App Router, TypeScript, Tailwind)
- **Backend:** A single route handler within the same Next.js app fetches pages, runs analysis (Claude handles content judgment — evaluating answer-unit structure, entity clarity, credibility layer completeness — while rules-based checks handle schema/technical validation), and assembles the report
- **LLM provider:** Claude API (Anthropic) — chosen for strength on nuanced writing/rewrite tasks; single-provider, no multi-provider abstraction for v1
- **Competitor lookup:** Deferred — ships as a placeholder in v1 pending a search API decision (Brave Search / Serper); see 9
- **PDF generation:** Client-side (browser-side rendering), no server-side headless-browser dependency
- **Data layer:** None required for v1 (stateless); designed so a database can be added later without restructuring the core analysis pipeline

---

## 9. Open Questions for Next Round

- What counts as "success" for the internal test — a target GEO score accuracy, or simply "the recommendations feel right" to the team?
- Should competitor selection be fully automatic, or should the user be able to specify known competitors to compare against?
- Which search API to wire in for competitor lookup, and when — Brave Search vs. Serper vs. something else?
- What's the rough timeline/budget for Phase 2 (live AI-engine testing), since it introduces ongoing API costs and needs to be re-scoped from scratch?

---

## 10. Appendix: Reference Sources

The scoring weights, checklist items, and framework in this PRD are grounded in the following sources. Documented here so assumptions can be traced back and re-validated as GEO practice evolves.

**Primary research (source of the actual weightings)**
- Aggarwal et al., *"GEO: Generative Engine Optimization,"* KDD 2024 (Princeton / Georgia Tech / Allen Institute for AI / IIT Delhi) — the founding empirical study; source of the "statistics/citations/quotations" content-substance findings. Worth reading in full rather than secondhand summaries for the actual experimental methodology.
- 252,000-trial competitive citation study, arXiv 2605.25517 (2026) — more recent, models *competitive* citation (multiple sources competing for one slot), closer to real-world conditions than the original study's isolated tests. Source of the "topic match, price, recency, position" gatekeeper-factor finding.

**Official standards and specs (ground technical checks in the spec itself, not paraphrases)**
- **schema.org** — exact, current property definitions for Article, FAQPage, HowTo, LocalBusiness, Product/Offer, BreadcrumbList, etc.
- **llms.txt** proposal (llmstxt.org, Jeremy Howard/Answer.AI, 2024) — the spec behind the AI-crawler-accessibility check in 4.2.C. Note: adoption is still uneven across AI providers, so this should stay a flagged/minor check, not a heavily-weighted one.
- Individual AI crawler documentation — OpenAI (GPTBot), Perplexity (PerplexityBot), Anthropic (ClaudeBot), Google (Google-Extended) each publish their own user-agent and `robots.txt` directive docs; these are the source of truth for the crawler-accessibility check, more reliable than third-party summaries.

**Google's own guidance**
- Google Search Central, *"Optimizing for Generative AI Features on Google Search"* — directly addresses and debunks some common "GEO hacks," useful for keeping the app's recommendations honest rather than folklore-driven.
- Google Search Quality Rater Guidelines — primary source for the E-E-A-T framework referenced in the credibility/entity bucket.

**Practitioner course material (source of the page-anatomy and evaluation-metric framework)**
- The internal GEO course notes provided during planning — source of the answer-unit template (Claim → Context → Evidence → Takeaway), the credibility-layer checklist, and the schema type-matching guidance.
- Kontent.ai, *"How to optimize content for AI and LLMs: A practical guide to GEO"* — source of the readability-level target, image/alt-text guidance, descriptive-link-text check, content-type prioritization, and the over-optimization guardrail.

**Competitor product research (informs UX/output patterns, not copied directly)**
- Adobe LLM Optimizer documentation (experienceleague.adobe.com) — most detailed public docs of the three tools reviewed.
- Pixis Visibility and Semrush AI Visibility Toolkit product pages — informed the AI-crawler-accessibility check and general output-format ideas (prioritized action plans, visibility scoring).

**Ongoing sources — recheck periodically, since GEO practice is still evolving**
- Search Engine Land / Search Engine Journal GEO coverage — practitioner-level, updates frequently; useful for catching new techniques or debunked ones before they go stale in the app's logic.
- Ahrefs and Profound citation-pattern research — large-scale studies (millions of AI Overviews, hundreds of millions of prompts); useful for periodically re-validating the scoring weights in 4.2 rather than treating them as fixed.
