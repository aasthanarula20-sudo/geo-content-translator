import { NextResponse } from "next/server";
import { z } from "zod";
import { runGeoPipeline } from "@/lib/pipeline";

// The pipeline makes two sequential LLM calls (analysis + rewrite) on top
// of fetching the page, which can comfortably exceed Vercel's default
// serverless timeout. Extend it (60s is the max on the Hobby plan) and pin
// the Node.js runtime explicitly (jsdom/cheerio aren't Edge-compatible, and
// maxDuration semantics differ between runtimes).
export const runtime = "nodejs";
export const maxDuration = 60;

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

  try {
    const result = await runGeoPipeline(parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            code: result.code,
            message: result.message,
            ...(result.canPasteInstead ? { canPasteInstead: true } : {}),
          },
        },
        { status: result.status }
      );
    }
    return NextResponse.json(result.report);
  } catch (err) {
    // Safety net: any unexpected exception anywhere in the pipeline still
    // returns valid JSON instead of a raw crash page the client can't parse.
    return NextResponse.json(
      {
        error: {
          code: "unexpected_error",
          message: err instanceof Error ? err.message : "Something went wrong during analysis.",
        },
      },
      { status: 500 }
    );
  }
}
