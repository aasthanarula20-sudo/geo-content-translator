import type { Effort, Impact, Owner, Severity } from "@/lib/types";

const SEVERITY_STYLES: Record<Severity, string> = {
  pass: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  fail: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  pass: "Pass",
  warning: "Warning",
  fail: "Fail",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

const IMPACT_STYLES: Record<Impact, string> = {
  High: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  Medium: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function ImpactBadge({ impact }: { impact: Impact }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${IMPACT_STYLES[impact]}`}>
      {impact} impact
    </span>
  );
}

export function EffortBadge({ effort }: { effort: Effort }) {
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {effort}
    </span>
  );
}

export function OwnerBadge({ owner }: { owner: Owner }) {
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
      {owner}
    </span>
  );
}
