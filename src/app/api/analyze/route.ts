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
import { encodeEvent } from "@/lib/progressEvents";
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

  // Fail fast, before any real work, if nothing can actually run the analysis.
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

  // Everything past this point streams real progress back to the client as
  // newline-delimited JSON, rather than making the client wait in silence.
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Parameters<typeof encodeEvent>[0]) => controller.enqueue(encodeEvent(event));

      try {
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
            send({
              type: "progress",
              step: "Fetching page",
              detail: `Fetched ${finalUrl} (${extracted.wordCount.toLocaleString()} words)`,
            });

            const robots = await fetchRobotsAndLlmsTxt(page.finalUrl);
            robotsTxt = robots.robotsTxt;
            llmsTxt = robots.llmsTxt;
          } catch (err) {
            if (err instanceof FetchPageError) {
              send({ type: "error", error: { code: err.code, message: err.message, canPasteInstead: true } });
              return;
            }
            throw err;
          }
        } else if (rawText) {
          extracted = extractFromRawText(rawText);
          fetchedVia = "pasted";
          warnings.push(
            "Analyzed from pasted content — technical crawler checks (robots.txt/llms.txt) are not applicable."
          );
          send({
            type: "progress",
            step: "Reading pasted content",
            detail: `Using pasted content (${extracted.wordCount.toLocaleString()} words)`,
          });
        } else {
          send({ type: "error", error: { code: "bad_request", message: "No content to analyze." } });
          return;
        }

        if (!extracted || extracted.wordCount < MIN_WORD_COUNT) {
          send({
            type: "error",
            error: {
              code: "insufficient_content",
              message: `Only found ${extracted?.wordCount ?? 0} words of content — too thin to score reliably. Try a different page or paste more of the article text.`,
            },
          });
          return;
        }

        const crawlerAccessibility = url
          ? checkCrawlerAccessibility(robotsTxt, llmsTxt)
          : {
              robotsTxtFound: false,
              llmsTxtFound: false,
              blockedCrawlers: [],
              gatePassed: true,
              note: "Not applicable — analyzed from pasted content, not a live URL.",
            };
        send({ type: "progress", step: "Checking AI crawler access", detail: crawlerAccessibility.note });

        const ruleContentFindings: Finding[] = [
          checkReadability(extracted.textContent),
          checkAltText(extracted.images),
          checkInternalLinkText(extracted.internalLinks),
          ...checkStructuralElements(extracted),
        ];
        const ruleCredibilityFindings: Finding[] = [checkAuthorBox(extracted), checkLastUpdated(extracted)];
        send({
          type: "progress",
          step: "Running rules-based checks",
          detail: `${ruleContentFindings.length + ruleCredibilityFindings.length} content & credibility checks run`,
        });

        if (provider === "openrouter") {
          warnings.push(
            "This analysis used a free OpenRouter model for testing, not Claude — quality (especially the rewrite) will be noticeably lower than production results. Set ANTHROPIC_API_KEY to switch to Claude."
          );
        }

        send({
          type: "progress",
          step: "Analyzing with AI",
          detail: provider === "openrouter" ? "Asking a free OpenRouter model to judge content quality…" : "Asking Claude to judge content quality…",
        });

        let llmAnalysis;
        try {
          llmAnalysis = await analyzeContent(extracted, finalUrl);
        } catch (err) {
          send({
            type: "error",
            error: {
              code: "llm_analysis_failed",
              message: err instanceof Error ? err.message : "The AI analysis step failed.",
            },
          });
          return;
        }
        const contentType = llmAnalysis.contentType;
        send({
          type: "progress",
          step: "Analyzing with AI",
          detail: `Detected a "${contentType.replace(/_/g, " ")}" page, found ${llmAnalysis.findings.length} content-level findings`,
        });

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
        send({
          type: "progress",
          step: "Scoring & prioritizing",
          detail: `Overall GEO score: ${overallScore}/100 — ${actionItems.length} action items ranked`,
        });

        send({
          type: "progress",
          step: "Generating rewrite",
          detail: "Writing a GEO-optimized version of the page…",
        });
        let rewriteMarkdown: string;
        try {
          rewriteMarkdown = await generateRewrite(extracted, contentType, allFindings, finalUrl);
        } catch (err) {
          send({
            type: "error",
            error: {
              code: "llm_rewrite_failed",
              message: err instanceof Error ? err.message : "The rewrite generation step failed.",
            },
          });
          return;
        }
        send({
          type: "progress",
          step: "Generating rewrite",
          detail: `Rewrite generated (~${rewriteMarkdown.split(/\s+/).length.toLocaleString()} words)`,
        });

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

        send({ type: "done", report });
      } catch (err) {
        send({
          type: "error",
          error: {
            code: "unexpected_error",
            message: err instanceof Error ? err.message : "Something went wrong during analysis.",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
