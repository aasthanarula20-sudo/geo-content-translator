"use client";

import { useState } from "react";
import { UrlInputForm } from "@/components/UrlInputForm";
import { LoadingProgress } from "@/components/LoadingProgress";
import { ReportView } from "@/components/report/ReportView";
import type { AnalysisReport } from "@/lib/types";

type Status = "idle" | "loading" | "report" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestPaste, setSuggestPaste] = useState(false);

  const runAnalysis = async (payload: { url?: string; rawText?: string }) => {
    setStatus("loading");
    setErrorMessage(null);
    setSuggestPaste(false);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error?.message || "Something went wrong analyzing this page.");
        setSuggestPaste(!!data.error?.canPasteInstead);
        setStatus("error");
        return;
      }
      setReport(data as AnalysisReport);
      setStatus("report");
    } catch {
      setErrorMessage("Network error while analyzing. Please try again.");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setReport(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 py-16 px-4">
      {status !== "report" ? (
        <div className="flex flex-col gap-10 items-center">
          <UrlInputForm
            onSubmitUrl={(url) => runAnalysis({ url })}
            onSubmitRawText={(rawText) => runAnalysis({ rawText })}
            disabled={status === "loading"}
            suggestPaste={suggestPaste}
            errorMessage={status === "error" ? errorMessage : null}
          />
          {status === "loading" && <LoadingProgress />}
        </div>
      ) : (
        report && <ReportView report={report} onReset={reset} />
      )}
    </div>
  );
}
