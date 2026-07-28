import type { ContentType, ExtractedContent, Finding } from "./types";
import { CONTENT_TYPES, buildAnalysisPrompt, buildRewritePrompt, extractJson } from "./promptTemplates";
import type { LlmAnalysis } from "./claude";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier OpenRouter models come and go — override with OPENROUTER_MODEL if
// this one stops being available. Check openrouter.ai/models (filter: "free").
const MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

async function callOpenRouter(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env.local to enable AI-powered analysis via OpenRouter."
    );
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://geo-content-translator.vercel.app",
      "X-Title": "GEO Content Optimizer",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `OpenRouter request failed (HTTP ${res.status}): ${body.slice(0, 300)}. If the free model "${MODEL}" is no longer available, set OPENROUTER_MODEL to a current free model from openrouter.ai/models.`
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter did not return any text content.");
  }
  return content;
}

export async function analyzeContentWithOpenRouter(
  extracted: ExtractedContent,
  url: string
): Promise<LlmAnalysis> {
  const prompt = buildAnalysisPrompt(extracted, url);
  const text = await callOpenRouter(prompt, 4000);

  const parsed = extractJson(text) as LlmAnalysis;
  if (!CONTENT_TYPES.includes(parsed.contentType)) {
    parsed.contentType = "narrative_editorial";
  }
  return parsed;
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
