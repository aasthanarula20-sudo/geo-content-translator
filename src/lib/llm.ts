import type { ContentType, ExtractedContent, Finding } from "./types";
import type { LlmAnalysis } from "./claude";
import { analyzeContentWithClaude, generateRewriteWithClaude } from "./claude";
import { analyzeContentWithOpenRouter, generateRewriteWithOpenRouter } from "./openrouter";

export type LlmProvider = "anthropic" | "openrouter";

// Anthropic (Claude) takes priority if both are configured. OpenRouter's free
// tier is meant for zero-cost testing only — swap to a Claude key for
// production-quality results (see README).
export function getActiveProvider(): LlmProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return null;
}

export async function analyzeContent(extracted: ExtractedContent, url: string): Promise<LlmAnalysis> {
  const provider = getActiveProvider();
  if (provider === "anthropic") return analyzeContentWithClaude(extracted, url);
  if (provider === "openrouter") return analyzeContentWithOpenRouter(extracted, url);
  throw new Error("No LLM provider configured. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY.");
}

export async function generateRewrite(
  extracted: ExtractedContent,
  contentType: ContentType,
  findings: Finding[],
  url: string
): Promise<string> {
  const provider = getActiveProvider();
  if (provider === "anthropic") return generateRewriteWithClaude(extracted, contentType, findings, url);
  if (provider === "openrouter") return generateRewriteWithOpenRouter(extracted, contentType, findings, url);
  throw new Error("No LLM provider configured. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY.");
}
