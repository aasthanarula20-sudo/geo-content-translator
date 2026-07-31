/**
 * Golden-set eval: score a small set of pages you already have a strong
 * opinion about, and diff the tool's output against your own judgment.
 *
 * Run this every time you change a prompt or scoring weight — it catches
 * you accidentally breaking something while "improving" it. Start with
 * 5-8 pages: a couple you know are strong, a couple you know are weak,
 * a couple ambiguous.
 *
 * Usage:
 *   import { scoreUrl } from "./adapter";
 *   const report = await runGoldenSet(scoreUrl, GOLDEN_SET);
 *   console.table(report.rows);
 */

import type { ScoreResult } from "./consistency";

export interface GoldenSetEntry {
  url: string;
  expectedRange: [number, number]; // e.g. [70, 100] for a page you know is strong
  note?: string; // why you rated it this way, for your own reference
}

// Fill this in with your own real pages. Keep it small and honest — the
// value is in catching regressions, not in having a big dataset.
export const GOLDEN_SET: GoldenSetEntry[] = [
  // { url: "https://birlaopus.com/some-strong-page", expectedRange: [70, 100], note: "has schema, FAQ, byline, recent date" },
  // { url: "https://birlaopus.com/some-weak-page", expectedRange: [0, 35], note: "no schema, no author, vague claims" },
];

export interface GoldenSetRow {
  url: string;
  expectedRange: [number, number];
  actualScore: number;
  withinExpectedRange: boolean;
  note?: string;
}

export interface GoldenSetReport {
  rows: GoldenSetRow[];
  passCount: number;
  failCount: number;
  passRate: number;
}

export async function runGoldenSet(
  scoreFn: (url: string) => Promise<ScoreResult>,
  set: GoldenSetEntry[] = GOLDEN_SET
): Promise<GoldenSetReport> {
  const rows: GoldenSetRow[] = [];

  for (const entry of set) {
    const result = await scoreFn(entry.url);
    const [lo, hi] = entry.expectedRange;
    const withinExpectedRange = result.overallScore >= lo && result.overallScore <= hi;
    rows.push({
      url: entry.url,
      expectedRange: entry.expectedRange,
      actualScore: result.overallScore,
      withinExpectedRange,
      note: entry.note,
    });
  }

  const passCount = rows.filter((r) => r.withinExpectedRange).length;
  const failCount = rows.length - passCount;

  return {
    rows,
    passCount,
    failCount,
    passRate: rows.length ? Math.round((passCount / rows.length) * 100) : 0,
  };
}
