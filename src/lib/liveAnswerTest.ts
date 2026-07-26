import type { LiveAnswerResult } from "./types";

/**
 * Built per PRD 4.2.1: capped 3 prompts x 1 engine x 2 versions, off by
 * default since it requires paid AI-engine API access. Flip
 * LIVE_ANSWER_TEST_ENABLED=true and wire in a provider call once that
 * access exists — no rebuild needed elsewhere in the pipeline.
 */
export async function runLiveAnswerTest(): Promise<LiveAnswerResult> {
  const enabled = process.env.LIVE_ANSWER_TEST_ENABLED === "true";

  if (!enabled) {
    return {
      enabled: false,
      note: "Live-answer testing available once connected to an AI provider API.",
    };
  }

  // Not implemented yet — flip the flag once you have API access to test with,
  // then wire the 3-question x 2-version (original vs rewritten) capped test here.
  return {
    enabled: true,
    note: "Live-answer test is enabled but not yet implemented.",
  };
}
