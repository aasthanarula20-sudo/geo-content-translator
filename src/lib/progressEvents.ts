import type { AnalysisReport } from "./types";

export interface ProgressStep {
  step: string;
  detail: string;
}

export type ProgressEvent =
  | ({ type: "progress" } & ProgressStep)
  | { type: "done"; report: AnalysisReport }
  | { type: "error"; error: { code: string; message: string; canPasteInstead?: boolean } };

export function encodeEvent(event: ProgressEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}
