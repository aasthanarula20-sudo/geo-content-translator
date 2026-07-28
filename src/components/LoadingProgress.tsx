"use client";

import type { ProgressStep } from "@/lib/progressEvents";

export function LoadingProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
      {steps.length === 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-slate-500 dark:text-slate-400">Starting…</span>
        </div>
      )}
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={`${s.step}-${i}`} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                isLast ? "bg-blue-500 animate-pulse" : "bg-green-500"
              }`}
            />
            <div>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{s.step}</p>
              <p className="text-slate-500 dark:text-slate-400">{s.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
