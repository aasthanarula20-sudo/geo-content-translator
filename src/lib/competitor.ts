import type { AnalysisReport } from "./types";

/**
 * Phase 1: no search API is wired in yet (see PRD 9 — competitor selection
 * automatic vs. user-specified is an open question). This stub keeps the
 * report section structurally in place without blocking the rest of the
 * pipeline, per the fallback-handling rule in PRD 5.1.
 */
export function stubCompetitorAnalysis(): AnalysisReport["competitor"] {
  return {
    available: false,
    note:
      "Competitor comparison isn't wired up yet — it needs a search API (e.g. Brave Search or Serper) to find pages currently ranking/cited for this topic. The rest of the report works independently of this section.",
    findings: [],
  };
}
