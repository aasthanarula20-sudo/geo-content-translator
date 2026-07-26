import type { AnalysisReport } from "@/lib/types";

function scoreColor(score: number) {
  if (score >= 75) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function ScoreHeader({ report }: { report: AnalysisReport }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {report.fetchedVia === "url" ? "Analyzed URL" : "Analyzed pasted content"}
          </p>
          <p className="text-slate-900 dark:text-slate-100 font-medium break-all">{report.url}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {new Date(report.timestamp).toLocaleString()} · Content type:{" "}
            {report.contentType.replace(/_/g, " ")}
          </p>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            GEO Score
          </p>
          <p className={`text-5xl font-bold ${scoreColor(report.overallScore)}`}>
            {report.overallScore}
          </p>
        </div>
      </div>

      {!report.crawlerAccessibility.gatePassed && (
        <div className="mt-4 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <strong>AI crawler access blocked:</strong> {report.crawlerAccessibility.note}
        </div>
      )}

      {report.warnings.map((w) => (
        <div
          key={w}
          className="mt-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-sm text-amber-800 dark:text-amber-300"
        >
          {w}
        </div>
      ))}
    </div>
  );
}
