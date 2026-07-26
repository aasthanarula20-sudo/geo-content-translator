"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Fetching page",
  "Analyzing content",
  "Checking technical factors",
  "Finding competitors",
  "Generating report",
];

export function LoadingProgress() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-3 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              i < stepIndex
                ? "bg-green-500"
                : i === stepIndex
                  ? "bg-blue-500 animate-pulse"
                  : "bg-slate-300 dark:bg-slate-700"
            }`}
          />
          <span
            className={
              i <= stepIndex
                ? "text-slate-900 dark:text-slate-100"
                : "text-slate-400 dark:text-slate-600"
            }
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}
