import type { ContentType, ExtractedContent, Finding } from "./types";
import type { LlmAnalysis } from "./claude";
import { analyzeContentWithClaude, generateRewriteWithClaude } from "./claude";
import { analyzeContentWithOpenRouter, generateRewriteWithOpenRouter } from "./openrouter";

export type LlmProvider = "anthropic" | "openrouter";

export interface LlmCallOptions {
  // Force a specific provider/model instead of the env-based default.
  // Used by the model-comparison eval to run the same page through two
  // different models in one process; the app itself never sets these.
  provider?: LlmProvider;
  model?: string;
}

// Anthropic (Claude) takes priority if both are configured. OpenRouter's free
// tier is meant for zero-cost testing only — swap to a Claude key for
// production-quality results (see README).
export function getActiveProvider(override?: LlmProvider): LlmProvider | null {
  if (override === "anthropic") return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (override === "openrouter") return process.env.OPENROUTER_API_KEY ? "openrouter" : null;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return null;
}

export async function analyzeContent(
  extracted: ExtractedContent,
  url: string,
  options: LlmCallOptions = {}
): Promise<LlmAnalysis> {
  const provider = getActiveProvider(options.provider);
  if (provider === "anthropic") return analyzeContentWithClaude(extracted, url, options.model);
  if (provider === "openrouter") return analyzeContentWithOpenRouter(extracted, url, options.model);
  throw new Error("No LLM provider configured. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY.");
}

export async function generateRewrite(
  extracted: ExtractedContent,
  contentType: ContentType,
  findings: Finding[],
  url: string,
  options: LlmCallOptions = {}
): Promise<string> {
  const provider = getActiveProvider(options.provider);
  if (provider === "anthropic") return generateRewriteWithClaude(extracted, contentType, findings, url, options.model);
  if (provider === "openrouter")
    return generateRewriteWithOpenRouter(extracted, contentType, findings, url, options.model);
  throw new Error("No LLM provider configured. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY.");
}
