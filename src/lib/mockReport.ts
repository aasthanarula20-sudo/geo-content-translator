import type { AnalysisReport } from "./types";

export const MOCK_REPORT: AnalysisReport = {
  url: "https://example.com/clear-aligners-cost-austin (sample data)",
  fetchedVia: "url",
  timestamp: new Date().toISOString(),
  contentType: "comparison",
  overallScore: 62,
  bucketScores: [
    { bucket: "content_substance", label: "Content substance & answer units", weight: 0.35, score: 55 },
    { bucket: "topic_structure", label: "Topic match & preferred structures", weight: 0.2, score: 70 },
    { bucket: "entity_credibility", label: "Entity clarity & credibility layer", weight: 0.2, score: 45 },
    { bucket: "freshness_fanout", label: "Freshness & fan-out coverage", weight: 0.15, score: 80 },
    { bucket: "technical_schema", label: "Technical/schema", weight: 0.1, score: 60 },
  ],
  crawlerAccessibility: {
    robotsTxtFound: true,
    llmsTxtFound: false,
    blockedCrawlers: [],
    gatePassed: true,
    note: "AI crawlers are not blocked by robots.txt.",
  },
  findings: {
    content: [
      {
        bucket: "content_substance",
        title: "Claims lack nearby evidence",
        detail: "Several pricing claims appear without a source or citation next to them.",
        why: "Evidence placed beside the claim it supports is what lets AI engines cite with confidence.",
        severity: "fail",
      },
      {
        bucket: "topic_structure",
        title: "Comparison table present",
        detail: "Page includes at least one <table>.",
        why: "Comparison tables are a structure AI engines are built to extract cleanly.",
        severity: "pass",
      },
    ],
    credibility: [
      {
        bucket: "entity_credibility",
        title: "Author byline is boilerplate",
        detail: "Detected: Admin",
        why: "A generic 'Admin' byline provides no real credibility signal.",
        severity: "warning",
      },
      {
        bucket: "freshness_fanout",
        title: "Last-updated / date signal present",
        detail: "Detected: 2026-06-01",
        why: "A visible, current date reassures AI engines that facts are current.",
        severity: "pass",
      },
    ],
    technical: [
      {
        bucket: "technical_schema",
        title: "Schema type doesn't match detected content type",
        detail: "Found: BlogPosting. Expected one of: Article, BlogPosting.",
        why: "Matching schema to visible content builds trust with AI engines.",
        severity: "warning",
      },
    ],
  },
  competitor: {
    available: false,
    note: "Competitor comparison isn't wired up yet — it needs a search API to find pages currently ranking/cited for this topic.",
    findings: [],
  },
  actionItems: [
    {
      title: "Claims lack nearby evidence",
      bucket: "content_substance",
      impact: "High",
      effort: "Copy-only",
      owner: "Writer/SME",
      tier: 1,
    },
    {
      title: "Author byline is boilerplate",
      bucket: "entity_credibility",
      impact: "Medium",
      effort: "Content team",
      owner: "Editor/ops",
      tier: 2,
    },
    {
      title: "Schema type doesn't match detected content type",
      bucket: "technical_schema",
      impact: "Low",
      effort: "Dev required",
      owner: "Schema owner",
      tier: 3,
    },
  ],
  rewriteMarkdown: `# What Do Clear Aligners Cost in Austin?

Most adult clear-aligner plans in Austin run approximately $3,000-$5,500.

<!-- Tier 1 · Content substance · High impact · Copy-only · Owner: Writer/SME -->

## Frequently Asked Questions

**Does insurance cover clear aligners?**
Some PPO plans offer partial orthodontic coverage — check your plan's annual maximum.

**How long does treatment take?**
Most adult cases run 6-18 months depending on complexity.

*(This is sample rewrite content for demo purposes — a real analysis produces a full page rewrite based on your actual content.)*`,
  wireframeAnnotations: [
    { block: "Executive definition", note: "Above the fold — must answer the core query directly." },
    { block: "Structured element", note: "Comparison table with fixed criteria." },
    { block: "Mini-FAQ block", note: "3-5 Q&A pairs, schema-ready." },
  ],
  warnings: [],
};
