import Anthropic from "@anthropic-ai/sdk";
import type { ContentType, ExtractedContent, Finding } from "./types";
import {
  buildAnalysisPrompt,
  buildRewritePrompt,
  extractJson,
  normalizeLlmAnalysis,
  type NormalizedLlmAnalysis,
} from "./promptTemplates";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI-powered analysis."
    );
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export type LlmAnalysis = NormalizedLlmAnalysis;

export async function analyzeContentWithClaude(
  extracted: ExtractedContent,
  url: string,
  modelOverride?: string
): Promise<LlmAnalysis> {
  const anthropic = getClient();
  const prompt = buildAnalysisPrompt(extracted, url);

  const response = await anthropic.messages.create({
    model: modelOverride || MODEL,
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return a text response for content analysis.");
  }

  return normalizeLlmAnalysis(extractJson(textBlock.text));
}

export async function generateRewriteWithClaude(
  extracted: ExtractedContent,
  contentType: ContentType,
  findings: Finding[],
  url: string,
  modelOverride?: string
): Promise<string> {
  const anthropic = getClient();
  const prompt = buildRewritePrompt(extracted, contentType, findings, url);

  const response = await anthropic.messages.create({
    model: modelOverride || MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return a text response for the rewrite.");
  }
  return textBlock.text.trim();
}
