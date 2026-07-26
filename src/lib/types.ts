export type ContentType =
  | "definition"
  | "comparison"
  | "faq_support"
  | "product_pricing"
  | "narrative_editorial"
  | "local_business";

export type Bucket =
  | "content_substance"
  | "topic_structure"
  | "entity_credibility"
  | "freshness_fanout"
  | "technical_schema";

export type Impact = "High" | "Medium" | "Low";
export type Effort = "Copy-only" | "Content team" | "Design change" | "Dev required";
export type Owner = "Writer/SME" | "Content architect" | "Schema owner" | "Editor/ops";
export type Severity = "pass" | "warning" | "fail";

export interface Finding {
  bucket: Bucket;
  title: string;
  detail: string;
  why: string;
  severity: Severity;
}

export interface ActionItem {
  title: string;
  bucket: Bucket;
  impact: Impact;
  effort: Effort;
  owner: Owner;
  tier: 1 | 2 | 3 | 4;
}

export interface BucketScore {
  bucket: Bucket;
  label: string;
  weight: number;
  score: number; // 0-100
}

export interface CrawlerAccessibility {
  robotsTxtFound: boolean;
  llmsTxtFound: boolean;
  blockedCrawlers: string[];
  gatePassed: boolean;
  note: string;
}

export interface CompetitorFinding {
  url: string;
  gap: string;
}

export interface LiveAnswerResult {
  enabled: boolean;
  note: string;
  results?: {
    question: string;
    original: { presence: boolean; attribution: string; faithfulness: string };
    rewritten: { presence: boolean; attribution: string; faithfulness: string };
  }[];
}

export interface AnalysisReport {
  url: string;
  fetchedVia: "url" | "pasted";
  timestamp: string;
  contentType: ContentType;
  overallScore: number;
  bucketScores: BucketScore[];
  crawlerAccessibility: CrawlerAccessibility;
  findings: {
    content: Finding[];
    credibility: Finding[];
    technical: Finding[];
  };
  competitor: {
    available: boolean;
    note: string;
    findings: CompetitorFinding[];
  };
  liveAnswerTest: LiveAnswerResult;
  actionItems: ActionItem[];
  rewriteMarkdown: string;
  wireframeAnnotations: { block: string; note: string }[];
  warnings: string[];
}

export interface ExtractedContent {
  title: string;
  textContent: string;
  contentHtml: string;
  wordCount: number;
  headings: { level: number; text: string }[];
  images: { alt: string | null; src: string }[];
  internalLinks: { text: string; href: string }[];
  hasTable: boolean;
  hasNumberedList: boolean;
  faqLikePairs: number;
  jsonLd: Record<string, unknown>[];
  authorSignals: string[];
  lastUpdatedSignals: string[];
}
