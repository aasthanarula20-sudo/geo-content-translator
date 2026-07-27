import type { AnalysisReport } from "@/lib/types";
import { ScoreHeader } from "./ScoreHeader";
import { BucketBars } from "./BucketBars";
import { FindingsSection } from "./FindingsSection";
import { ActionList } from "./ActionList";
import { CompetitiveSection } from "./CompetitiveSection";
import { Wireframe } from "./Wireframe";
import { RewriteExport } from "./RewriteExport";
import { PdfExportButton } from "./PdfExportButton";

export function ReportView({
  report,
  onReset,
  isDemo = false,
}: {
  report: AnalysisReport;
  onReset: () => void;
  isDemo?: boolean;
}) {
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Analyze another page
        </button>
        <PdfExportButton targetId="geo-report" />
      </div>

      {isDemo && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>This is a sample report with made-up data</strong> — it shows what the app
          produces, but no real page was analyzed and no AI was called. Add an{" "}
          <code className="font-mono">ANTHROPIC_API_KEY</code> and analyze a real URL to get an
          actual report.
        </div>
      )}

      <div id="geo-report" className="flex flex-col gap-6">
        <ScoreHeader report={report} />
        <BucketBars bucketScores={report.bucketScores} />
        <FindingsSection title="Content Findings" findings={report.findings.content} />
        <FindingsSection title="Entity & Credibility Findings" findings={report.findings.credibility} />
        <FindingsSection title="Technical Findings" findings={report.findings.technical} />
        <CompetitiveSection competitor={report.competitor} />
        <ActionList actionItems={report.actionItems} />
      </div>

      <Wireframe annotations={report.wireframeAnnotations} />
      <RewriteExport markdown={report.rewriteMarkdown} />
    </div>
  );
}
