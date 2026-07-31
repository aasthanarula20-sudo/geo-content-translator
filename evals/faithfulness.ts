/**
 * Faithfulness check for the GEO-optimized rewrite.
 *
 * The riskiest part of the tool isn't the score — it's the rewrite. An LLM
 * rewrite can quietly invent a stat, a claim, or a credibility signal that
 * wasn't in the original page. This runs a second, narrowly-scoped LLM call
 * whose ONLY job is to list unsupported claims — it never sees the scoring
 * prompt, so it can't be biased by "make this score well."
 *
 * This always calls Claude directly (not whichever provider generated the
 * rewrite) so the check isn't graded by the same model that wrote the
 * content — that requires ANTHROPIC_API_KEY specifically, even if the app
 * itself is running on the free OpenRouter fallback.
 *
 * Usage:
 *   import { getReportForFaithfulness } from "./adapter";
 *   const { originalText, rewriteMarkdown } = await getReportForFaithfulness(url);
 *   const result = await checkFaithfulness(originalText, rewriteMarkdown);
 *   if (!result.passed) console.log(result.unsupportedClaims);
 */

import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton, not constructed at module load — matches src/lib/claude.ts.
// Building the client eagerly at import time means any script that imports
// this file (even one that never calls checkFaithfulness) crashes without
// ANTHROPIC_API_KEY, which is exactly the module-load-time crash class this
// project already burned a debugging session on in production.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. The faithfulness check always uses Claude directly, regardless of which provider generated the rewrite."
    );
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const FAITHFULNESS_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export interface UnsupportedClaim {
  claim: string; // the sentence/fact from the rewrite
  reason: string; // why it's not supported by the original
  severity: "minor" | "major"; // minor = phrasing/emphasis, major = fabricated fact/stat
}

export interface FaithfulnessResult {
  passed: boolean;
  unsupportedClaims: UnsupportedClaim[];
  rawModelOutput: string;
}

const FAITHFULNESS_PROMPT = `You are a strict fact-checker. You will be given an ORIGINAL page's content and a REWRITE of that page.

Your only job: identify any factual claim, statistic, credential, or specific detail in the REWRITE that is NOT present in or directly inferable from the ORIGINAL.

Do not evaluate quality, tone, or structure — only factual faithfulness.

Rules:
- A claim is "unsupported" if it introduces new facts, numbers, names, dates, or credibility signals (e.g. "industry-leading", "award-winning", "since 1998") not found in the original.
- Reasonable paraphrasing or summarizing is fine and should NOT be flagged.
- Generic filler ("our team is dedicated to quality") is fine and should NOT be flagged unless the original explicitly lacks any such claim and the rewrite states it as fact.
- Placeholders like "[insert verified figure]" are the rewrite correctly declining to invent a fact — do NOT flag these.
- Mark severity "major" for fabricated statistics, dates, credentials, or specific factual claims. Mark "minor" for embellished but plausible phrasing.

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "unsupportedClaims": [
    { "claim": "...", "reason": "...", "severity": "minor" | "major" }
  ]
}
If there are none, return {"unsupportedClaims": []}.

ORIGINAL:
"""
{{ORIGINAL}}
"""

REWRITE:
"""
{{REWRITE}}
"""`;

export async function checkFaithfulness(original: string, rewrite: string): Promise<FaithfulnessResult> {
  const anthropic = getClient();
  const prompt = FAITHFULNESS_PROMPT.replace("{{ORIGINAL}}", original).replace("{{REWRITE}}", rewrite);

  const response = await anthropic.messages.create({
    model: FAITHFULNESS_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("");

  let parsed: { unsupportedClaims: UnsupportedClaim[] };
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // If parsing fails, fail closed — treat as a failed check rather than
    // silently passing. You want to see this in logs, not hide it.
    return {
      passed: false,
      unsupportedClaims: [
        { claim: "(parse error)", reason: "Model output wasn't valid JSON — check rawModelOutput", severity: "major" },
      ],
      rawModelOutput: text,
    };
  }

  const hasMajor = parsed.unsupportedClaims.some((c) => c.severity === "major");

  return {
    passed: parsed.unsupportedClaims.length === 0 || !hasMajor,
    unsupportedClaims: parsed.unsupportedClaims,
    rawModelOutput: text,
  };
}
