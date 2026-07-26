import type { AnalysisReport } from "@/lib/types";

export function CompetitiveSection({ competitor }: { competitor: AnalysisReport["competitor"] }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Competitive Findings
      </h2>
      {!competitor.available ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{competitor.note}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {competitor.findings.map((f, i) => (
            <li key={i} className="text-sm">
              <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline break-all">
                {f.url}
              </a>
              <p className="text-slate-600 dark:text-slate-400 mt-1">{f.gap}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
