/**
 * CLI entrypoint for all four evals. Run from the repo root:
 *
 *   npx tsx evals/run.ts consistency <url> [runs=5]
 *   npx tsx evals/run.ts golden
 *   npx tsx evals/run.ts faithfulness <url>
 *   npx tsx evals/run.ts compare <url1,url2,...> <modelA> <modelB>
 *
 * Loads .env.local from the repo root itself (a standalone script isn't
 * running through `next dev`/`next build`, which normally does this for
 * you) — the env vars are loaded before the pipeline modules are imported,
 * so this works whether you're on ANTHROPIC_API_KEY, OPENROUTER_API_KEY, or
 * both.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

function printUsage() {
  console.log(`Usage: npx tsx evals/run.ts <command> [...args]

Commands:
  consistency <url> [runs=5]              Run the same URL N times, check score variance
  golden                                  Run GOLDEN_SET (edit evals/goldenSet.ts first)
  faithfulness <url>                      Check the rewrite for fabricated claims (needs ANTHROPIC_API_KEY)
  compare <url1,url2,...> <modelA> <modelB>   Compare two models' scores across URLs

Run from the repo root so .env.local and relative paths resolve correctly.`);
}

async function main() {
  loadEnvLocal();

  // Dynamic imports, deliberately after loadEnvLocal() — these modules (via
  // adapter -> pipeline -> llm/openrouter) read API keys from process.env at
  // call time, but openrouter.ts also reads OPENROUTER_MODEL at module load
  // time for its default fallback list. A static import at the top of this
  // file would run before .env.local is loaded and silently miss that
  // override.
  const [{ runConsistencyCheck }, { runGoldenSet, GOLDEN_SET }, { checkFaithfulness }, { compareModelsAcrossSet }, { scoreUrl, scoreUrlWithModel, getReportForFaithfulness }] =
    await Promise.all([
      import("./consistency"),
      import("./goldenSet"),
      import("./faithfulness"),
      import("./modelCompare"),
      import("./adapter"),
    ]);

  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case "consistency": {
      const url = args[0];
      const runs = args[1] ? Number(args[1]) : 5;
      if (!url) {
        printUsage();
        process.exitCode = 1;
        return;
      }
      const report = await runConsistencyCheck(scoreUrl, url, runs);
      console.log(report.flagged ? "UNSTABLE scoring — investigate before trusting this score." : "Scoring looks stable.");
      console.table(report.overallScores.map((s, i) => ({ run: i + 1, overallScore: s })));
      console.log(report);
      break;
    }
    case "golden": {
      if (GOLDEN_SET.length === 0) {
        console.log("GOLDEN_SET is empty — add real pages to evals/goldenSet.ts first.");
        return;
      }
      const report = await runGoldenSet(scoreUrl);
      console.table(report.rows);
      console.log(`${report.passCount}/${report.rows.length} within expected range (${report.passRate}%)`);
      break;
    }
    case "faithfulness": {
      const url = args[0];
      if (!url) {
        printUsage();
        process.exitCode = 1;
        return;
      }
      const { originalText, rewriteMarkdown } = await getReportForFaithfulness(url);
      const result = await checkFaithfulness(originalText, rewriteMarkdown);
      console.log(result.passed ? "PASSED — no major unsupported claims." : "FAILED — unsupported claims found.");
      console.table(result.unsupportedClaims);
      break;
    }
    case "compare": {
      const [urlsArg, modelA, modelB] = args;
      if (!urlsArg || !modelA || !modelB) {
        printUsage();
        process.exitCode = 1;
        return;
      }
      const urls = urlsArg.split(",").map((u) => u.trim());
      const { results, avgAbsDiff } = await compareModelsAcrossSet(scoreUrlWithModel, urls, modelA, modelB);
      console.table(results);
      console.log(`Average absolute score gap: ${avgAbsDiff} points`);
      break;
    }
    default:
      printUsage();
      process.exitCode = cmd ? 1 : 0;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
