import type { ActionItem, Bucket, BucketScore, Effort, Finding, Impact, Owner } from "./types";

export const BUCKET_META: Record<Bucket, { label: string; weight: number }> = {
  content_substance: { label: "Content substance & answer units", weight: 0.35 },
  topic_structure: { label: "Topic match & preferred structures", weight: 0.2 },
  entity_credibility: { label: "Entity clarity & credibility layer", weight: 0.2 },
  freshness_fanout: { label: "Freshness & fan-out coverage", weight: 0.15 },
  technical_schema: { label: "Technical/schema", weight: 0.1 },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function adjustScoreWithFindings(baseScore: number, findings: Finding[]): number {
  const penalty = findings.reduce((acc, f) => {
    if (f.severity === "fail") return acc - 10;
    if (f.severity === "warning") return acc - 5;
    return acc;
  }, 0);
  return clamp(Math.round(baseScore + penalty), 0, 100);
}

export function technicalScoreFromFindings(findings: Finding[]): number {
  if (findings.length === 0) return 50;
  const points = findings.reduce((acc, f) => {
    if (f.severity === "pass") return acc + 1;
    if (f.severity === "warning") return acc + 0.5;
    return acc;
  }, 0);
  return clamp(Math.round((points / findings.length) * 100), 0, 100);
}

export function buildBucketScores(scores: Record<Bucket, number>): BucketScore[] {
  return (Object.keys(BUCKET_META) as Bucket[]).map((bucket) => ({
    bucket,
    label: BUCKET_META[bucket].label,
    weight: BUCKET_META[bucket].weight,
    score: scores[bucket],
  }));
}

export function computeOverallScore(bucketScores: BucketScore[]): number {
  const total = bucketScores.reduce((acc, b) => acc + b.score * b.weight, 0);
  return Math.round(total);
}

const TIER2_TOPIC_KEYWORDS = ["faq", "comparison table", "mini-faq", "numbered steps"];
const TIER2_CREDIBILITY_KEYWORDS = ["author"];

function classifyFinding(f: Finding): Omit<ActionItem, "title"> {
  const titleLower = f.title.toLowerCase();

  switch (f.bucket) {
    case "content_substance":
      return { bucket: f.bucket, tier: 1, impact: "High", effort: "Copy-only", owner: "Writer/SME" };

    case "topic_structure": {
      if (TIER2_TOPIC_KEYWORDS.some((k) => titleLower.includes(k))) {
        return {
          bucket: f.bucket,
          tier: 2,
          impact: "Medium",
          effort: "Content team",
          owner: "Content architect",
        };
      }
      return { bucket: f.bucket, tier: 1, impact: "High", effort: "Copy-only", owner: "Writer/SME" };
    }

    case "entity_credibility": {
      if (TIER2_CREDIBILITY_KEYWORDS.some((k) => titleLower.includes(k))) {
        return {
          bucket: f.bucket,
          tier: 2,
          impact: "Medium",
          effort: "Content team",
          owner: "Editor/ops",
        };
      }
      return {
        bucket: f.bucket,
        tier: 1,
        impact: "Medium",
        effort: "Copy-only",
        owner: "Writer/SME",
      };
    }

    case "freshness_fanout":
      return {
        bucket: f.bucket,
        tier: 2,
        impact: "Medium",
        effort: "Content team",
        owner: "Editor/ops",
      };

    case "technical_schema":
    default:
      return {
        bucket: f.bucket,
        tier: 3,
        impact: "Low",
        effort: "Dev required",
        owner: "Schema owner",
      };
  }
}

const IMPACT_ORDER: Record<Impact, number> = { High: 0, Medium: 1, Low: 2 };

export function buildActionList(allFindings: Finding[]): ActionItem[] {
  const actionable = allFindings.filter((f) => f.severity !== "pass");
  const items: ActionItem[] = actionable.map((f) => ({
    title: f.title,
    ...classifyFinding(f),
  }));

  return items.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
  });
}

export function effortLabel(effort: Effort): string {
  return effort;
}

export function ownerLabel(owner: Owner): string {
  return owner;
}
