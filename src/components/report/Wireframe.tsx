import type { AnalysisReport } from "@/lib/types";

export function Wireframe({ annotations }: { annotations: AnalysisReport["wireframeAnnotations"] }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Recommended Page Wireframe
      </h2>
      <div className="flex flex-col gap-2">
        {annotations.map((a, i) => (
          <div
            key={i}
            className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50"
          >
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {i + 1}. {a.block}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{a.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
