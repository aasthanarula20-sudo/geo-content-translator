"use client";

import { useState } from "react";
import { UrlInputForm } from "@/components/UrlInputForm";
import { LoadingProgress } from "@/components/LoadingProgress";
import { ReportView } from "@/components/report/ReportView";
import { FeatureHighlights } from "@/components/FeatureHighlights";
import { MOCK_REPORT } from "@/lib/mockReport";
import type { ProgressEvent } from "@/lib/progressEvents";
import type { AnalysisReport } from "@/lib/types";

type Status = "idle" | "loading" | "report" | "error";

const REQUEST_TIMEOUT_MS = 55_000;

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestPaste, setSuggestPaste] = useState(false);

  const runAnalysis = async (payload: { url?: string; rawText?: string }) => {
    setStatus("loading");
    setErrorMessage(null);
    setSuggestPaste(false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Early, non-streamed errors (bad request / missing provider) — plain JSON.
        const data = await res.json();
        setErrorMessage(data.error?.message || "Something went wrong analyzing this page.");
        setSuggestPaste(!!data.error?.canPasteInstead);
        setStatus("error");
        return;
      }

      if (!res.body) {
        setErrorMessage("The server didn't return a response body. Try again.");
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let settled = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ProgressEvent;
          if (event.type === "done") {
            setReport(event.report);
            setIsDemo(false);
            setStatus("report");
            settled = true;
          } else if (event.type === "error") {
            setErrorMessage(event.error.message);
            setSuggestPaste(!!event.error.canPasteInstead);
            setStatus("error");
            settled = true;
          }
        }
      }

      if (!settled) {
        setErrorMessage("The connection ended before the analysis finished. Try again.");
        setStatus("error");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setErrorMessage(
          "This is taking longer than expected (over 55 seconds). Long pages and the AI rewrite step can take a while — try again, or try a shorter page."
        );
      } else {
        setErrorMessage(
          "Couldn't reach the server. Check your connection and try again — if it keeps happening, the app may not be deployed correctly."
        );
      }
      setStatus("error");
    } finally {
      clearTimeout(timeout);
    }
  };

  const viewSampleReport = () => {
    setReport(MOCK_REPORT);
    setIsDemo(true);
    setErrorMessage(null);
    setStatus("report");
  };

  const reset = () => {
    setStatus("idle");
    setReport(null);
    setIsDemo(false);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-zinc-50 to-zinc-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 py-16 px-4">
      {status !== "report" ? (
        <div className="flex flex-col gap-12 items-center">
          <div className="flex flex-col items-center gap-3 text-center max-w-xl">
            <span className="text-4xl">🔎</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">
              GEO Content Optimizer
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Paste a URL and find out if AI answer engines like ChatGPT and Perplexity can
              actually find, read, and cite your page — then get a ready-to-use rewrite that
              fixes what&apos;s holding it back.
            </p>
          </div>

          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 sm:p-8">
            <UrlInputForm
              onSubmitUrl={(url) => runAnalysis({ url })}
              onSubmitRawText={(rawText) => runAnalysis({ rawText })}
              disabled={status === "loading"}
              suggestPaste={suggestPaste}
              errorMessage={status === "error" ? errorMessage : null}
            />
            {status === "loading" && (
              <div className="mt-8">
                <LoadingProgress />
              </div>
            )}
            {status !== "loading" && (
              <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Want to see what a report looks like first?{" "}
                <button
                  onClick={viewSampleReport}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View a sample report
                </button>{" "}
                — free, no key needed.
              </p>
            )}
          </div>

          {status === "idle" && <FeatureHighlights />}
        </div>
      ) : (
        report && <ReportView report={report} onReset={reset} isDemo={isDemo} />
      )}
    </div>
  );
}
