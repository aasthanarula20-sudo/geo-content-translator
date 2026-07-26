import Anthropic from "@anthropic-ai/sdk";
import type { ContentType, ExtractedContent, Finding } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI-powered analysis."
    );
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim());
}

const CONTENT_TYPES: ContentType[] = [
  "definition",
  "comparison",
  "faq_support",
  "product_pricing",
  "narrative_editorial",
  "local_business",
];

export interface ClaudeAnalysis {
  contentType: ContentType;
  contentSubstanceScore: number;
  topicStructureScore: number;
  entityCredibilityScore: number;
  freshnessFanoutScore: number;
  findings: Finding[];
}

export async function analyzeContentWithClaude(
  extracted: ExtractedContent,
  url: string
): Promise<ClaudeAnalysis> {
  const anthropic = getClient();

  const truncated = extracted.textContent.slice(0, 12000);

  const prompt = `You are a GEO (Generative Engine Optimization) auditor. GEO measures whether a page is likely to be found, read, reasoned over, and cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, Copilot) — not traditional SEO.

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

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return a text response for content analysis.");
  }

  const parsed = extractJson(textBlock.text) as ClaudeAnalysis;
  if (!CONTENT_TYPES.includes(parsed.contentType)) {
    parsed.contentType = "narrative_editorial";
  }
  return parsed;
}

export async function generateRewriteWithClaude(
  extracted: ExtractedContent,
  contentType: ContentType,
  findings: Finding[],
  url: string
): Promise<string> {
  const anthropic = getClient();
  const truncated = extracted.textContent.slice(0, 12000);

  const findingsSummary = findings
    .filter((f) => f.severity !== "pass")
    .map((f) => `- [${f.bucket}] ${f.title}: ${f.detail}`)
    .join("\n");

  const prompt = `You are rewriting a web page to be GEO-optimized (Generative Engine Optimization) — structured so AI answer engines can find, read, reason over, and confidently cite it — while staying genuinely good for human readers first.

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

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return a text response for the rewrite.");
  }
  return textBlock.text.trim();
}
