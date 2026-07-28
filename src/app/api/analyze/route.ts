import { NextResponse } from "next/server";
import { z } from "zod";
import { FetchPageError, fetchPage, fetchRobotsAndLlmsTxt } from "@/lib/fetchPage";
import { extractContent, extractFromRawText } from "@/lib/extractContent";
import { checkCrawlerAccessibility, evaluateSchema } from "@/lib/checks/technical";
import {
  checkAltText,
  checkInternalLinkText,
  checkReadability,
  checkStructuralElements,
} from "@/lib/checks/contentRules";
import { checkAuthorBox, checkLastUpdated } from "@/lib/checks/credibility";
import { analyzeContent, generateRewrite, getActiveProvider } from "@/lib/llm";
import {
  adjustScoreWithFindings,
  buildActionList,
  buildBucketScores,
  computeOverallScore,
  technicalScoreFromFindings,
} from "@/lib/scoring";
import { stubCompetitorAnalysis } from "@/lib/competitor";
import { buildWireframeAnnotations } from "@/lib/wireframe";
import type { AnalysisReport, Bucket, Finding } from "@/lib/types";

// The pipeline makes two sequential LLM calls (analysis + rewrite) on top
// of fetching the page, which can comfortably exceed Vercel's default
// serverless timeout. Extend it (60s is the max on the Hobby plan).
export const maxDuration = 60;

const MIN_WORD_COUNT = 40;

const requestSchema = z
  .object({
    url: z.string().optional(),
    rawText: z.string().optional(),
  })
  .refine((data) => data.url || data.rawText, {
    message: "Provide either a url or rawText.",
  });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid JSON body." } }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: parsed.error.issues[0]?.message || "Invalid request." } },
      { status: 400 }
    );
  }
  const { url, rawText } = parsed.data;

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
        return NextResponse.json(
          {
            error: {
              code: err.code,
              message: err.message,
              canPasteInstead: true,
            },
          },
          { status: 422 }
        );
      }
      throw err;
    }
  } else if (rawText) {
    extracted = extractFromRawText(rawText);
    fetchedVia = "pasted";
    warnings.push("Analyzed from pasted content — technical crawler checks (robots.txt/llms.txt) are not applicable.");
  } else {
    return NextResponse.json({ error: { code: "bad_request", message: "No content to analyze." } }, { status: 400 });
  }

  if (!extracted || extracted.wordCount < MIN_WORD_COUNT) {
    return NextResponse.json(
      {
        error: {
          code: "insufficient_content",
          message: `Only found ${extracted?.wordCount ?? 0} words of content — too thin to score reliably. Try a different page or paste more of the article text.`,
        },
      },
      { status: 422 }
    );
  }

  const provider = getActiveProvider();
  if (!provider) {
    return NextResponse.json(
      {
        error: {
          code: "missing_api_key",
          message:
            "No AI provider is configured on the server. Add ANTHROPIC_API_KEY (or OPENROUTER_API_KEY for free-tier testing) to .env.local to enable analysis.",
        },
      },
      { status: 500 }
    );
  }
  if (provider === "openrouter") {
    warnings.push(
      "This analysis used a free OpenRouter model for testing, not Claude — quality (especially the rewrite) will be noticeably lower than production results. Set ANTHROPIC_API_KEY to switch to Claude."
    );
  }

  let llmAnalysis;
  try {
    llmAnalysis = await analyzeContent(extracted, finalUrl);
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "llm_analysis_failed",
          message: err instanceof Error ? err.message : "The AI analysis step failed.",
        },
      },
      { status: 502 }
    );
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

  const ruleCredibilityFindings: Finding[] = [
    checkAuthorBox(extracted),
    checkLastUpdated(extracted),
  ];

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
    rewriteMarkdown = await generateRewrite(extracted, contentType, allFindings, finalUrl);
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "llm_rewrite_failed",
          message: err instanceof Error ? err.message : "The rewrite generation step failed.",
        },
      },
      { status: 502 }
    );
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

  return NextResponse.json(report);
}
