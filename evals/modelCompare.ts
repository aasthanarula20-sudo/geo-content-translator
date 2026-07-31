/**
 * Model comparison eval: formalizes the "Claude vs. free OpenRouter model"
 * quality gap into a repeatable, numeric comparison instead of a manual
 * impression from staring at two reports.
 *
 * Usage:
 *   import { scoreUrlWithModel } from "./adapter";
 *   const { results, avgAbsDiff } = await compareModelsAcrossSet(
 *     scoreUrlWithModel,
 *     ["https://site.com/page1", "https://site.com/page2"],
 *     "claude-sonnet-5",
 *     "nvidia/nemotron-3-super-120b-a12b:free"
 *   );
 *   console.table(results);
 */

import type { ScoreResult } from "./consistency";

export interface ModelCompareRow {
  url: string;
  modelA: string;
  modelB: string;
  scoreA: number;
  scoreB: number;
  absDiff: number;
}

export interface ModelCompareReport {
  results: ModelCompareRow[];
  avgAbsDiff: number;
}

export async function compareModelsAcrossSet(
  scoreFn: (url: string, model: string) => Promise<ScoreResult>,
  urls: string[],
  modelA: string,
  modelB: string
): Promise<ModelCompareReport> {
  const results: ModelCompareRow[] = [];

  for (const url of urls) {
    // sequential, not parallel — avoids rate limits on the free tier and
    // keeps A/B calls from competing for the same quota at once
    const a = await scoreFn(url, modelA);
    const b = await scoreFn(url, modelB);
    results.push({
      url,
      modelA,
      modelB,
      scoreA: a.overallScore,
      scoreB: b.overallScore,
      absDiff: Math.abs(a.overallScore - b.overallScore),
    });
  }

  const avgAbsDiff = results.length
    ? Math.round((results.reduce((sum, r) => sum + r.absDiff, 0) / results.length) * 10) / 10
    : 0;

  return { results, avgAbsDiff };
}
