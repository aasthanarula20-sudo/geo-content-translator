"use client";

import { useEffect, useState } from "react";

export function LoadingProgress() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <span className="h-9 w-9 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin" />
      <p className="text-slate-900 dark:text-slate-100 font-medium">We&apos;re analyzing your page…</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {elapsed}s elapsed — this usually takes 20-60 seconds
      </p>
    </div>
  );
}
