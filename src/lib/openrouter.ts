import type { ContentType, ExtractedContent, Finding } from "./types";
import { buildAnalysisPrompt, buildRewritePrompt, extractJson, normalizeLlmAnalysis } from "./promptTemplates";
import type { LlmAnalysis } from "./claude";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier OpenRouter models get retired or renamed with no warning (this
// list has already broken twice in production — every one of the previous
// candidates below was dead within the same day). If OPENROUTER_MODEL is
// set, only that model is tried — otherwise fall through this list in order
// and use the first one that actually responds, instead of hard-failing the
// whole analysis because one specific free slug disappeared. Verified live
// against openrouter.ai/models (filter: free) — confirm there again if this
// list goes stale.
const FALLBACK_FREE_MODELS = ["nvidia/nemotron-3-super-120b-a12b:free"];
const DEFAULT_MODELS_TO_TRY = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : FALLBACK_FREE_MODELS;

async function callOpenRouter(prompt: string, maxTokens: number, modelOverride?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env.local to enable AI-powered analysis via OpenRouter."
    );
  }

  // An explicit override (e.g. from the model-comparison eval) skips the
  // fallback list entirely — the caller asked for exactly one model.
  const modelsToTry = modelOverride ? [modelOverride] : DEFAULT_MODELS_TO_TRY;

  let lastError: Error | null = null;
  for (const model of modelsToTry) {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://geo-content-translator.vercel.app",
        "X-Title": "GEO Content Optimizer",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      lastError = new Error(`OpenRouter model "${model}" failed (HTTP ${res.status}): ${body.slice(0, 300)}`);
      continue;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      lastError = new Error(`OpenRouter model "${model}" returned no text content.`);
      continue;
    }
    return content;
  }

  throw new Error(
    `All OpenRouter free models failed. Last error: ${lastError?.message}. Set OPENROUTER_MODEL to a current free model from openrouter.ai/models.`
  );
}

export async function analyzeContentWithOpenRouter(
  extracted: ExtractedContent,
  url: string,
  modelOverride?: string
): Promise<LlmAnalysis> {
  const prompt = buildAnalysisPrompt(extracted, url);
  const text = await callOpenRouter(prompt, 4000, modelOverride);
  return normalizeLlmAnalysis(extractJson(text));
}

export async function generateRewriteWithOpenRouter(
  extracted: ExtractedContent,
  contentType: ContentType,
  findings: Finding[],
  url: string,
  modelOverride?: string
): Promise<string> {
  const prompt = buildRewritePrompt(extracted, contentType, findings, url);
  const text = await callOpenRouter(prompt, 8000, modelOverride);
  return text.trim();
}
