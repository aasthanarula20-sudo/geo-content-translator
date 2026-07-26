import type { ActionItem } from "@/lib/types";
import { EffortBadge, ImpactBadge, OwnerBadge } from "./badges";

const TIER_LABEL: Record<ActionItem["tier"], string> = {
  1: "Tier 1 · Quick win",
  2: "Tier 2 · Fast follow",
  3: "Tier 3 · Dev required",
  4: "Flagged, not actionable",
};

export function ActionList({ actionItems }: { actionItems: ActionItem[] }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Prioritized Action List
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Sorted by highest score impact + lowest deployment effort first.
      </p>
      {actionItems.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No action items — this page passed every check.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {actionItems.map((item, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-slate-100 dark:border-slate-800 p-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {TIER_LABEL[item.tier]}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ImpactBadge impact={item.impact} />
                <EffortBadge effort={item.effort} />
                <OwnerBadge owner={item.owner} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
