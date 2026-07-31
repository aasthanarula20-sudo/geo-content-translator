/**
 * Consistency check: run the same URL through the real scoring pipeline N
 * times and measure how much the score moves. LLM scoring is
 * non-deterministic — if the same page swings from 27 to 45 across runs,
 * that's worth knowing before you trust any single score.
 *
 * This file doesn't call the model itself — it wraps whatever scoring
 * function you pass in via `scoreFn` (see adapter.ts for the one wired to
 * this project's real pipeline).
 *
 * Usage:
 *   import { scoreUrl } from "./adapter";
 *   const report = await runConsistencyCheck(scoreUrl, "https://example.com", 5);
 *   console.log(report);
 */

export interface ScoreResult {
  overallScore: number;
  categoryScores: Record<string, number>;
}

export interface ConsistencyReport {
  url: string;
  runs: number;
  overallScores: number[];
  overallMean: number;
  overallStdDev: number;
  overallRange: number; // max - min
  categoryStdDev: Record<string, number>;
  flagged: boolean; // true if variance is high enough to warrant attention
}

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[]): number {
  const m = mean(nums);
  const variance = mean(nums.map((n) => (n - m) ** 2));
  return Math.sqrt(variance);
}

export async function runConsistencyCheck(
  scoreFn: (url: string) => Promise<ScoreResult>,
  url: string,
  runs: number = 5
): Promise<ConsistencyReport> {
  const results: ScoreResult[] = [];
  for (let i = 0; i < runs; i += 1) {
    // sequential, not parallel — avoids rate limits (especially on the free
    // OpenRouter tier) and keeps runs independent
    const r = await scoreFn(url);
    results.push(r);
  }

  const overallScores = results.map((r) => r.overallScore);
  const categoryKeys = Object.keys(results[0]?.categoryScores || {});
  const categoryStdDev: Record<string, number> = {};
  categoryKeys.forEach((key) => {
    const vals = results.map((r) => r.categoryScores[key]);
    categoryStdDev[key] = Math.round(stdDev(vals) * 10) / 10;
  });

  const overallStdDev = Math.round(stdDev(overallScores) * 10) / 10;
  const overallRange = Math.max(...overallScores) - Math.min(...overallScores);

  return {
    url,
    runs,
    overallScores,
    overallMean: Math.round(mean(overallScores) * 10) / 10,
    overallStdDev,
    overallRange,
    categoryStdDev,
    // rule of thumb: a >10-point swing on a 100-point scale across identical
    // runs means the scoring prompt needs tightening before you trust it
    flagged: overallRange > 10,
  };
}
