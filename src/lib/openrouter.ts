import type { ContentType, ExtractedContent, Finding } from "./types";
import { buildAnalysisPrompt, buildRewritePrompt, extractJson, normalizeLlmAnalysis } from "./promptTemplates";
import type { LlmAnalysis } from "./claude";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier OpenRouter models get retired or renamed with no warning (this
// list has already broken once in production). If OPENROUTER_MODEL is set,
// only that model is tried — otherwise fall through this list in order and
// use the first one that actually responds, instead of hard-failing the
// whole analysis because one specific free slug disappeared.
const FALLBACK_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "deepseek/deepseek-chat-v3.1:free",
];
const MODELS_TO_TRY = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : FALLBACK_FREE_MODELS;

async function callOpenRouter(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env.local to enable AI-powered analysis via OpenRouter."
    );
  }

  let lastError: Error | null = null;
  for (const model of MODELS_TO_TRY) {
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
  url: string
): Promise<LlmAnalysis> {
  const prompt = buildAnalysisPrompt(extracted, url);
  const text = await callOpenRouter(prompt, 4000);
  return normalizeLlmAnalysis(extractJson(text));
}

export async function generateRewriteWithOpenRouter(
  extracted: ExtractedContent,
  contentType: ContentType,
  findings: Finding[],
  url: string
): Promise<string> {
  const prompt = buildRewritePrompt(extracted, contentType, findings, url);
  const text = await callOpenRouter(prompt, 8000);
  return text.trim();
}
