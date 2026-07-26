import type { AnalysisReport } from "@/lib/types";
import { ScoreHeader } from "./ScoreHeader";
import { BucketBars } from "./BucketBars";
import { FindingsSection } from "./FindingsSection";
import { ActionList } from "./ActionList";
import { CompetitiveSection } from "./CompetitiveSection";
import { Wireframe } from "./Wireframe";
import { RewriteExport } from "./RewriteExport";
import { PdfExportButton } from "./PdfExportButton";

export function ReportView({ report, onReset }: { report: AnalysisReport; onReset: () => void }) {
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
