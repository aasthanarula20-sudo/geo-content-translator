"use client";

function downloadMarkdown(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RewriteExport({ markdown }: { markdown: string }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          GEO-Optimized Rewrite
        </h2>
        <button
          onClick={() => downloadMarkdown(markdown, "geo-optimized-rewrite.md")}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Download .md
        </button>
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
        {markdown}
      </pre>
    </section>
  );
}
