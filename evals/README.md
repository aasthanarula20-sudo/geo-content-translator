# GEO Optimizer — Eval Framework

Four evals, wired to the real pipeline (`src/lib/pipeline.ts` — the same code the live app calls), roughly in order of effort vs. value.

Run everything through the CLI from the repo root:

```
npx tsx evals/run.ts <command> [...args]
```

It loads `.env.local` itself, so whatever `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` you already have configured for the app works here too.

## 1. `consistency.ts` — is the score even stable?
Runs the same URL through the real pipeline N times and measures variance. Do this first: if the same page swings more than ~10 points across identical runs, fix that before trusting anything else.

```
npx tsx evals/run.ts consistency https://yoursite.com/page 5
```

If it comes back flagged, the usual fixes are: lower the model's temperature, make the scoring prompt ask for evidence per point deducted (forces it to justify rather than vibe), or split one big "score everything" call into smaller calls, one per bucket.

## 2. `goldenSet.ts` — does it match your own judgment?
Fill in `GOLDEN_SET` in `evals/goldenSet.ts` with 5-8 real pages you already have a strong opinion about. Re-run this after any prompt/weight change to catch regressions.

```
npx tsx evals/run.ts golden
```

## 3. `faithfulness.ts` — the important one
Checks whether the *rewrite* invents facts, stats, or credibility signals that weren't in the original page. This is the highest-risk part of the tool — a rewrite that fabricates a claim is worse than a low score. Always uses Claude directly for the check (regardless of which provider generated the rewrite), so it needs `ANTHROPIC_API_KEY` set even if the app itself is running on the free OpenRouter fallback.

```
npx tsx evals/run.ts faithfulness https://yoursite.com/page
```

Treat a failed check as blocking, not a warning, before you'd publish a rewrite.

## 4. `modelCompare.ts` — formalize the Claude vs. free-model gap
Turns the "Claude vs. free OpenRouter model" quality difference into a repeatable, numeric comparison.

```
npx tsx evals/run.ts compare https://site.com/page1,https://site.com/page2 claude-sonnet-5 nvidia/nemotron-3-super-120b-a12b:free
```

Model IDs: any Anthropic model id (e.g. `claude-sonnet-5`) or any OpenRouter slug (e.g. `nvidia/nemotron-3-super-120b-a12b:free` — check current options at openrouter.ai/models, free models get retired without notice).

## Files

- `adapter.ts` — wires the evals to the real pipeline (`src/lib/pipeline.ts`). If you ever change the pipeline's shape, this is the only file that needs to know.
- `consistency.ts`, `goldenSet.ts`, `faithfulness.ts`, `modelCompare.ts` — the evals themselves, each pure (they take a `scoreFn`/data as a parameter, no direct dependency on the pipeline) so they stay testable on their own.
- `run.ts` — the CLI entrypoint tying it all together.

## What this gives you for the resume/interview
- **"How did you evaluate whether the AI output was good?"** → consistency + golden-set answers this for the *scorer*.
- **"How do you catch hallucination in an LLM product?"** → faithfulness check answers this for the *rewrite*.
- **"How did you choose your model?"** → model comparison gives you an actual number, not a feeling.

None of this needs to be fancy or automated in CI on day one — running these manually a few times before you write the resume bullet is enough to make the claim true.
