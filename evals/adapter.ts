/**
 * Wires the eval scripts to this project's real pipeline (src/lib/pipeline.ts)
 * instead of a re-implementation — the evals exercise exactly the same
 * fetch/extract/score/rewrite logic the live app uses.
 */

import { runGeoPipeline } from "../src/lib/pipeline";
import type { LlmProvider } from "../src/lib/llm";
import type { ScoreResult } from "./consistency";

function toScoreResult(report: { overallScore: number; bucketScores: { bucket: string; score: number }[] }): ScoreResult {
  return {
    overallScore: report.overallScore,
    categoryScores: Object.fromEntries(report.bucketScores.map((b) => [b.bucket, b.score])),
  };
}

/** Scores a URL using whichever provider is configured via env vars (same as the live app). */
export async function scoreUrl(url: string): Promise<ScoreResult> {
  const result = await runGeoPipeline({ url });
  if (!result.ok) throw new Error(`[${result.code}] ${result.message}`);
  return toScoreResult(result.report);
}

/**
 * Scores a URL forcing a specific model. Provider is inferred from the model
 * string: OpenRouter slugs are namespaced ("provider/model", e.g.
 * "nvidia/nemotron-3-super-120b-a12b:free"); anything without a "/" is
 * treated as an Anthropic model id (e.g. "claude-sonnet-5").
 */
export async function scoreUrlWithModel(url: string, model: string): Promise<ScoreResult> {
  const provider: LlmProvider = model.includes("/") ? "openrouter" : "anthropic";
  const result = await runGeoPipeline({ url }, { provider, model });
  if (!result.ok) throw new Error(`[${result.code}] ${result.message}`);
  return toScoreResult(result.report);
}

/** Runs the full pipeline and returns what the faithfulness check needs: the original page text and the generated rewrite. */
export async function getReportForFaithfulness(url: string): Promise<{ originalText: string; rewriteMarkdown: string }> {
  const result = await runGeoPipeline({ url });
  if (!result.ok) throw new Error(`[${result.code}] ${result.message}`);
  return { originalText: result.originalText, rewriteMarkdown: result.report.rewriteMarkdown };
}
