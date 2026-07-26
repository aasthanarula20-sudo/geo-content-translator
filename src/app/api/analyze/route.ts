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
import { analyzeContentWithClaude, generateRewriteWithClaude } from "@/lib/claude";
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: {
          code: "missing_api_key",
          message:
            "ANTHROPIC_API_KEY is not configured on the server. Add it to .env.local to enable analysis.",
        },
      },
      { status: 500 }
    );
  }

  const claudeAnalysis = await analyzeContentWithClaude(extracted, finalUrl);
  const contentType = claudeAnalysis.contentType;

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

  const claudeContentFindings = claudeAnalysis.findings.filter(
    (f) => f.bucket === "content_substance" || f.bucket === "topic_structure"
  );
  const claudeCredibilityFindings = claudeAnalysis.findings.filter(
    (f) => f.bucket === "entity_credibility" || f.bucket === "freshness_fanout"
  );

  const contentFindings = [
    ...ruleContentFindings.filter((f) => f.bucket === "content_substance"),
    ...claudeContentFindings.filter((f) => f.bucket === "content_substance"),
    ...ruleContentFindings.filter((f) => f.bucket === "topic_structure"),
    ...claudeContentFindings.filter((f) => f.bucket === "topic_structure"),
  ];
  const credibilityFindings = [...ruleCredibilityFindings, ...claudeCredibilityFindings];

  const contentSubstanceBucketScore = adjustScoreWithFindings(
    claudeAnalysis.contentSubstanceScore,
    ruleContentFindings.filter((f) => f.bucket === "content_substance")
  );
  const topicStructureBucketScore = adjustScoreWithFindings(
    claudeAnalysis.topicStructureScore,
    ruleContentFindings.filter((f) => f.bucket === "topic_structure")
  );
  const entityCredibilityBucketScore = adjustScoreWithFindings(
    claudeAnalysis.entityCredibilityScore,
    ruleCredibilityFindings.filter((f) => f.bucket === "entity_credibility")
  );
  const freshnessFanoutBucketScore = adjustScoreWithFindings(
    claudeAnalysis.freshnessFanoutScore,
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

  const rewriteMarkdown = await generateRewriteWithClaude(extracted, contentType, allFindings, finalUrl);

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
