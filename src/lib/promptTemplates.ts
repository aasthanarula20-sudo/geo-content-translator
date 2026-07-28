import type { Bucket, ContentType, ExtractedContent, Finding, Severity } from "./types";

export const CONTENT_TYPES: ContentType[] = [
  "definition",
  "comparison",
  "faq_support",
  "product_pricing",
  "narrative_editorial",
  "local_business",
];

const ANALYSIS_BUCKETS: Bucket[] = [
  "content_substance",
  "topic_structure",
  "entity_credibility",
  "freshness_fanout",
];
const SEVERITIES: Severity[] = ["pass", "warning", "fail"];

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim());
}

export interface NormalizedLlmAnalysis {
  contentType: ContentType;
  contentSubstanceScore: number;
  topicStructureScore: number;
  entityCredibilityScore: number;
  freshnessFanoutScore: number;
  findings: Finding[];
}

function toScore(value: unknown, fallback = 50): number {
  // Deliberately not a blind Number(value) coercion — Number(null) is 0 and
  // Number("") is 0, which would silently pass off a missing field as a
  // real (and misleadingly low) score instead of falling back.
  let n: number;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string" && value.trim() !== "") {
    n = Number(value);
  } else {
    return fallback;
  }
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/**
 * Free/weaker LLMs are far less reliable than Claude at returning exactly the
 * JSON shape asked for — missing fields, wrong types, or a findings array
 * that isn't an array at all. Normalize whatever comes back into a shape the
 * rest of the pipeline can safely consume, instead of trusting a raw cast
 * that can crash downstream with an unhandled exception.
 */
export function normalizeLlmAnalysis(raw: unknown): NormalizedLlmAnalysis {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const contentType = CONTENT_TYPES.includes(obj.contentType as ContentType)
    ? (obj.contentType as ContentType)
    : "narrative_editorial";

  const rawFindings = Array.isArray(obj.findings) ? obj.findings : [];
  const findings: Finding[] = rawFindings
    .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
    .map((f) => ({
      bucket: ANALYSIS_BUCKETS.includes(f.bucket as Bucket) ? (f.bucket as Bucket) : "content_substance",
      title: toText(f.title, "Untitled finding"),
      detail: toText(f.detail, "No detail provided."),
      why: toText(f.why, "Not specified."),
      severity: SEVERITIES.includes(f.severity as Severity) ? (f.severity as Severity) : "warning",
    }));

  return {
    contentType,
    contentSubstanceScore: toScore(obj.contentSubstanceScore),
    topicStructureScore: toScore(obj.topicStructureScore),
    entityCredibilityScore: toScore(obj.entityCredibilityScore),
    freshnessFanoutScore: toScore(obj.freshnessFanoutScore),
    findings,
  };
}

export function buildAnalysisPrompt(extracted: ExtractedContent, url: string): string {
  const truncated = extracted.textContent.slice(0, 12000);

  return `You are a GEO (Generative Engine Optimization) auditor. GEO measures whether a page is likely to be found, read, reasoned over, and cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, Copilot) — not traditional SEO.

Analyze the page content below and return ONLY a JSON object (no prose, no markdown fences) with this exact shape:

{
  "contentType": one of ${JSON.stringify(CONTENT_TYPES)},
  "contentSubstanceScore": 0-100 integer,
  "topicStructureScore": 0-100 integer,
  "entityCredibilityScore": 0-100 integer,
  "freshnessFanoutScore": 0-100 integer,
  "findings": [
    {
      "bucket": one of "content_substance" | "topic_structure" | "entity_credibility" | "freshness_fanout",
      "title": short finding title,
      "detail": one sentence describing what you found on THIS page,
      "why": one sentence on why it matters for GEO specifically,
      "severity": "pass" | "warning" | "fail"
    }
  ]
}

Scoring guidance:
- contentSubstanceScore: reward Claim->Context->Evidence->Takeaway structure, checkable data over vague claims, evidence placed beside the claim it supports, canonical entity names defined on first mention. Penalize walls of text under generic headings, claims without citations, keyword stuffing, content that reads as written only for AI (robotic, generic, no human voice).
- topicStructureScore: reward executive definition near the top, question-shaped headings, structures that fit the content type (a narrative post should NOT be penalized for lacking a comparison table; a comparison/product page should).
- entityCredibilityScore: reward canonical entity names used consistently, a disclosure/scope line ("what this page covers/doesn't"), disclaimers where relevant for sensitive topics.
- freshnessFanoutScore: reward visible dates/update cadence, and whether the page appears to sit within a broader topic cluster (internal links to related deeper content) vs. standing completely alone.
- Judge fairly relative to the detected content type — do not force FAQ/comparison structure onto content where it doesn't fit.
- Produce 4-8 findings total across the four buckets, mixing pass/warning/fail based on genuine observations.

Page URL: ${url}
Page title: ${extracted.title}
Word count: ${extracted.wordCount}

--- PAGE CONTENT (main article text, may be truncated) ---
${truncated}
--- END PAGE CONTENT ---`;
}

export function buildRewritePrompt(
  extracted: ExtractedContent,
  contentType: ContentType,
  findings: Finding[],
  url: string
): string {
  const truncated = extracted.textContent.slice(0, 12000);

  const findingsSummary = findings
    .filter((f) => f.severity !== "pass")
    .map((f) => `- [${f.bucket}] ${f.title}: ${f.detail}`)
    .join("\n");

  return `You are rewriting a web page to be GEO-optimized (Generative Engine Optimization) — structured so AI answer engines can find, read, reason over, and confidently cite it — while staying genuinely good for human readers first.

Source page URL: ${url}
Detected content type: ${contentType}
Page title: ${extracted.title}

Issues found in the original page that the rewrite should fix:
${findingsSummary || "- No major issues found; polish and tighten structure."}

Write a complete, ready-to-publish Markdown page following this anatomy (skip any section that doesn't naturally fit the content type — e.g. don't force a comparison table onto a narrative post, don't force numbered steps onto a definition page):

1. Executive definition — 2-3 sentences at the very top, directly answering the core question/topic.
2. A structured element that fits the content type — numbered steps for procedures, or a comparison table with fixed criteria, whichever fits.
3. Answer units for each supporting claim, written as Claim -> Context -> Evidence -> Takeaway (inline, readable prose — not literally labeled).
4. Entities defined on first mention: canonical name, 1-2 sentence definition, consistent naming afterward.
5. A mini-FAQ: 3-5 tight Q&A pairs anticipating natural follow-ups.
6. A credibility layer: author line (name + 1-2 line credential), organization details if relevant, "Last updated: [date]" with a one-line change note, and a scope/watch-outs line.
7. Contextual CTAs placed at natural decision points in the content (not just top/bottom banners) — write the actual CTA copy inline where it belongs.
8. A suggested schema block at the end as a markdown code comment, naming the schema.org type that matches this content type and what it should include (about/mentions entities, @id).

On every major change/section, add an inline markdown comment tag showing tier, bucket, impact, effort, and owner, e.g.:
<!-- Tier 1 · Content substance · High impact · Copy-only · Owner: Writer/SME -->

Guardrail: prioritize human clarity first, AI-extractability second. Do not write in a robotic, keyword-stuffed, or generic tone. Base the rewrite on the actual substance of the original content below — do not invent facts, statistics, prices, or claims that aren't in or reasonably inferable from the source. Where the source lacks a specific fact needed for a claim, write it as a placeholder like "[insert verified figure]" rather than fabricating one.

--- ORIGINAL PAGE CONTENT ---
${truncated}
--- END ORIGINAL PAGE CONTENT ---

Return ONLY the Markdown document, no preamble, no explanation before or after.`;
}
