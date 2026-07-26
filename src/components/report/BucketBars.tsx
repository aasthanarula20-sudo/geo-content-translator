import type { BucketScore } from "@/lib/types";

function barColor(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function BucketBars({ bucketScores }: { bucketScores: BucketScore[] }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Score Breakdown
      </h2>
      <div className="flex flex-col gap-4">
        {bucketScores.map((b) => (
          <div key={b.bucket}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-700 dark:text-slate-300">
                {b.label}{" "}
                <span className="text-slate-400 dark:text-slate-500">
                  ({Math.round(b.weight * 100)}% weight)
                </span>
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{b.score}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor(b.score)}`}
                style={{ width: `${b.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Off-page/entity authority (backlinks, brand mentions, reviews) is flagged in context but
        not scored — it&apos;s outside what a single-URL analysis can measure or fix.
      </p>
    </section>
  );
}
