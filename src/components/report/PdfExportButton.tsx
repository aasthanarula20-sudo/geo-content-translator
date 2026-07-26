"use client";

import { useState } from "react";
import { exportElementToPdf } from "@/lib/pdfExport";

export function PdfExportButton({ targetId }: { targetId: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setExporting(true);
    try {
      await exportElementToPdf(el, "geo-report.pdf");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50"
    >
      {exporting ? "Exporting..." : "Export report as PDF"}
    </button>
  );
}
