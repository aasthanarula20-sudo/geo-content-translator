import type { Finding } from "@/lib/types";
import { SeverityBadge } from "./badges";

export function FindingsSection({ title, findings }: { title: string; findings: Finding[] }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{title}</h2>
      {findings.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No findings in this section.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {findings.map((f, i) => (
            <li key={i} className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 last:border-0 pb-4 last:pb-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={f.severity} />
                <span className="font-medium text-slate-900 dark:text-slate-100">{f.title}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{f.detail}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 italic">Why it matters: {f.why}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
