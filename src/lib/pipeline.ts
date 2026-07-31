import { FetchPageError, fetchPage, fetchRobotsAndLlmsTxt } from "./fetchPage";
import { extractContent, extractFromRawText } from "./extractContent";
import { checkCrawlerAccessibility, evaluateSchema } from "./checks/technical";
import {
  checkAltText,
  checkInternalLinkText,
  checkReadability,
  checkStructuralElements,
} from "./checks/contentRules";
import { checkAuthorBox, checkLastUpdated } from "./checks/credibility";
import { analyzeContent, generateRewrite, getActiveProvider, type LlmCallOptions } from "./llm";
import {
  adjustScoreWithFindings,
  buildActionList,
  buildBucketScores,
  computeOverallScore,
  technicalScoreFromFindings,
} from "./scoring";
import { stubCompetitorAnalysis } from "./competitor";
import { buildWireframeAnnotations } from "./wireframe";
import type { AnalysisReport, Bucket, Finding } from "./types";

const MIN_WORD_COUNT = 40;

export interface PipelineInput {
  url?: string;
  rawText?: string;
}

export interface PipelineError {
  ok: false;
  status: number;
  code: string;
  message: string;
  canPasteInstead?: boolean;
}

export interface PipelineSuccess {
  ok: true;
  report: AnalysisReport;
  // Not part of the HTTP response — kept around for eval scripts (the
  // faithfulness check needs the original text to compare the rewrite
  // against).
  originalText: string;
}

export type PipelineResult = PipelineSuccess | PipelineError;

/**
 * The full analyze pipeline (fetch/extract -> rules checks -> LLM analysis
 * -> scoring -> LLM rewrite), independent of HTTP. The API route wraps this
 * in NextResponse.json(); eval scripts call it directly so they exercise the
 * exact same logic instead of a re-implementation that can drift out of sync.
 */
export async function runGeoPipeline(
  input: PipelineInput,
  options: LlmCallOptions = {}
): Promise<PipelineResult> {
  const { url, rawText } = input;

  const provider = getActiveProvider(options.provider);
  if (!provider) {
    return {
      ok: false,
      status: 500,
      code: "missing_api_key",
      message:
        "No AI provider is configured on the server. Add ANTHROPIC_API_KEY (or OPENROUTER_API_KEY for free-tier testing) to .env.local to enable analysis.",
    };
  }

  const warnings: string[] = [];
  let extracted;
  let fetchedVia: "url" | "pasted" = "pasted";
  let robotsTxt: string | null = null;
  let llmsTxt: string | null = null;
  let finalUrl = url || "pasted-content";

  if (url) {
    try {
      const page = await fetchPage(url);
      finalUrl = page.finalUrl;
      extracted = extractContent(page.html, page.finalUrl);
      fetchedVia = "url";
      const robots = await fetchRobotsAndLlmsTxt(page.finalUrl);
      robotsTxt = robots.robotsTxt;
      llmsTxt = robots.llmsTxt;
    } catch (err) {
      if (err instanceof FetchPageError) {
        return { ok: false, status: 422, code: err.code, message: err.message, canPasteInstead: true };
      }
      throw err;
    }
  } else if (rawText) {
    extracted = extractFromRawText(rawText);
    fetchedVia = "pasted";
    warnings.push("Analyzed from pasted content — technical crawler checks (robots.txt/llms.txt) are not applicable.");
  } else {
    return { ok: false, status: 400, code: "bad_request", message: "No content to analyze." };
  }

  if (!extracted || extracted.wordCount < MIN_WORD_COUNT) {
    return {
      ok: false,
      status: 422,
      code: "insufficient_content",
      message: `Only found ${extracted?.wordCount ?? 0} words of content — too thin to score reliably. Try a different page or paste more of the article text.`,
    };
  }

  if (provider === "openrouter") {
    warnings.push(
      "This analysis used a free OpenRouter model for testing, not Claude — quality (especially the rewrite) will be noticeably lower than production results. Set ANTHROPIC_API_KEY to switch to Claude."
    );
  }

  let llmAnalysis;
  try {
    llmAnalysis = await analyzeContent(extracted, finalUrl, options);
  } catch (err) {
    return {
      ok: false,
      status: 502,
      code: "llm_analysis_failed",
      message: err instanceof Error ? err.message : "The AI analysis step failed.",
    };
  }
  const contentType = llmAnalysis.contentType;

  const crawlerAccessibility = url
    ? checkCrawlerAccessibility(robotsTxt, llmsTxt)
    : {
        robotsTxtFound: false,
        llmsTxtFound: false,
        blockedCrawlers: [],
        gatePassed: true,
        note: "Not applicable — analyzed from pasted content, not a live URL.",
      };

  const ruleContentFindings: Finding[] = [
    checkReadability(extracted.textContent),
    checkAltText(extracted.images),
    checkInternalLinkText(extracted.internalLinks),
    ...checkStructuralElements(extracted),
  ];

  const ruleCredibilityFindings: Finding[] = [checkAuthorBox(extracted), checkLastUpdated(extracted)];

  const technicalFindings: Finding[] = evaluateSchema(extracted.jsonLd, contentType);

  const llmContentFindings = llmAnalysis.findings.filter(
    (f) => f.bucket === "content_substance" || f.bucket === "topic_structure"
  );
  const llmCredibilityFindings = llmAnalysis.findings.filter(
    (f) => f.bucket === "entity_credibility" || f.bucket === "freshness_fanout"
  );

  const contentFindings = [
    ...ruleContentFindings.filter((f) => f.bucket === "content_substance"),
    ...llmContentFindings.filter((f) => f.bucket === "content_substance"),
    ...ruleContentFindings.filter((f) => f.bucket === "topic_structure"),
    ...llmContentFindings.filter((f) => f.bucket === "topic_structure"),
  ];
  const credibilityFindings = [...ruleCredibilityFindings, ...llmCredibilityFindings];

  const contentSubstanceBucketScore = adjustScoreWithFindings(
    llmAnalysis.contentSubstanceScore,
    ruleContentFindings.filter((f) => f.bucket === "content_substance")
  );
  const topicStructureBucketScore = adjustScoreWithFindings(
    llmAnalysis.topicStructureScore,
    ruleContentFindings.filter((f) => f.bucket === "topic_structure")
  );
  const entityCredibilityBucketScore = adjustScoreWithFindings(
    llmAnalysis.entityCredibilityScore,
    ruleCredibilityFindings.filter((f) => f.bucket === "entity_credibility")
  );
  const freshnessFanoutBucketScore = adjustScoreWithFindings(
    llmAnalysis.freshnessFanoutScore,
    ruleCredibilityFindings.filter((f) => f.bucket === "freshness_fanout")
  );
  const technicalBucketScore = technicalScoreFromFindings(technicalFindings);

  const bucketScores = buildBucketScores({
    content_substance: contentSubstanceBucketScore,
    topic_structure: topicStructureBucketScore,
    entity_credibility: entityCredibilityBucketScore,
    freshness_fanout: freshnessFanoutBucketScore,
    technical_schema: technicalBucketScore,
  } as Record<Bucket, number>);

  const overallScore = computeOverallScore(bucketScores);

  const allFindings = [...contentFindings, ...credibilityFindings, ...technicalFindings];
  const actionItems = buildActionList(allFindings);

  let rewriteMarkdown: string;
  try {
    rewriteMarkdown = await generateRewrite(extracted, contentType, allFindings, finalUrl, options);
  } catch (err) {
    return {
      ok: false,
      status: 502,
      code: "llm_rewrite_failed",
      message: err instanceof Error ? err.message : "The rewrite generation step failed.",
    };
  }

  const competitor = stubCompetitorAnalysis();
  const wireframeAnnotations = buildWireframeAnnotations(contentType);

  if (!crawlerAccessibility.gatePassed) {
    warnings.push(
      `AI crawler access is blocked (${crawlerAccessibility.blockedCrawlers.join(", ")}) — this page may score well but never be seen by AI answer engines.`
    );
  }

  const report: AnalysisReport = {
    url: finalUrl,
    fetchedVia,
    timestamp: new Date().toISOString(),
    contentType,
    overallScore,
    bucketScores,
    crawlerAccessibility,
    findings: {
      content: contentFindings,
      credibility: credibilityFindings,
      technical: technicalFindings,
    },
    competitor,
    actionItems,
    rewriteMarkdown,
    wireframeAnnotations,
    warnings,
  };

  return { ok: true, report, originalText: extracted.textContent };
}
