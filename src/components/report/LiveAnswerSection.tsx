import type { AnalysisReport } from "@/lib/types";

export function LiveAnswerSection({ liveAnswerTest }: { liveAnswerTest: AnalysisReport["liveAnswerTest"] }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Before/After Live-Answer Test
      </h2>
      {!liveAnswerTest.enabled || !liveAnswerTest.results ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{liveAnswerTest.note}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {liveAnswerTest.results.map((r, i) => (
            <li key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 pb-4 last:pb-0">
              <p className="font-medium text-slate-900 dark:text-slate-100">{r.question}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-sm">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs uppercase text-slate-500 mb-1">Original</p>
                  <p>Presence: {r.original.presence ? "Yes" : "No"}</p>
                  <p>Attribution: {r.original.attribution}</p>
                  <p>Faithfulness: {r.original.faithfulness}</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                  <p className="text-xs uppercase text-slate-500 mb-1">Rewritten</p>
                  <p>Presence: {r.rewritten.presence ? "Yes" : "No"}</p>
                  <p>Attribution: {r.rewritten.attribution}</p>
                  <p>Faithfulness: {r.rewritten.faithfulness}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
