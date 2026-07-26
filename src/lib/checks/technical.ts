import type { ContentType, CrawlerAccessibility, Finding } from "../types";

const AI_CRAWLERS = ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended", "*"];

export function checkCrawlerAccessibility(
  robotsTxt: string | null,
  llmsTxt: string | null
): CrawlerAccessibility {
  const blockedCrawlers: string[] = [];

  if (robotsTxt) {
    const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim());
    let currentAgents: string[] = [];
    for (const line of lines) {
      if (/^user-agent:/i.test(line)) {
        const agent = line.split(":")[1]?.trim() || "";
        currentAgents = [agent];
      } else if (/^disallow:/i.test(line)) {
        const path = line.split(":").slice(1).join(":").trim();
        if (path === "/") {
          for (const agent of currentAgents) {
            const match = AI_CRAWLERS.find(
              (bot) => bot.toLowerCase() === agent.toLowerCase()
            );
            if (match && !blockedCrawlers.includes(match)) blockedCrawlers.push(match);
          }
        }
      }
    }
  }

  const wildcardBlocked = blockedCrawlers.includes("*");
  const gatePassed = blockedCrawlers.length === 0;

  let note: string;
  if (!robotsTxt) {
    note = "No robots.txt found — nothing is explicitly blocking AI crawlers.";
  } else if (wildcardBlocked) {
    note =
      "robots.txt disallows all crawlers ('User-agent: *, Disallow: /'), which blocks AI answer engines too.";
  } else if (blockedCrawlers.length > 0) {
    note = `robots.txt blocks: ${blockedCrawlers.join(", ")}. This page cannot be seen by those AI engines regardless of content quality.`;
  } else {
    note = "AI crawlers are not blocked by robots.txt.";
  }

  return {
    robotsTxtFound: !!robotsTxt,
    llmsTxtFound: !!llmsTxt,
    blockedCrawlers,
    gatePassed,
    note,
  };
}

const SCHEMA_BY_CONTENT_TYPE: Record<ContentType, string[]> = {
  definition: ["Article", "DefinedTerm", "BlogPosting"],
  comparison: ["Article", "BlogPosting"],
  faq_support: ["FAQPage", "Article"],
  product_pricing: ["Product", "Offer", "AggregateRating"],
  narrative_editorial: ["Article", "BlogPosting"],
  local_business: ["LocalBusiness"],
};

export function evaluateSchema(jsonLd: Record<string, unknown>[], contentType: ContentType): Finding[] {
  const findings: Finding[] = [];
  const types = new Set<string>();
  for (const block of jsonLd) {
    const t = block["@type"];
    if (typeof t === "string") types.add(t);
    if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
  }

  if (types.size === 0) {
    findings.push({
      bucket: "technical_schema",
      title: "No schema.org markup found",
      detail: "The page has no JSON-LD structured data.",
      why: "Schema helps AI engines confirm entity type and key facts programmatically, without relying on parsing alone.",
      severity: "fail",
    });
    return findings;
  }

  const expected = SCHEMA_BY_CONTENT_TYPE[contentType];
  const hasExpected = expected.some((e) => types.has(e));

  if (hasExpected) {
    findings.push({
      bucket: "technical_schema",
      title: `Schema type matches page content (${Array.from(types).join(", ")})`,
      detail: `Found schema types: ${Array.from(types).join(", ")}.`,
      why: "Matching schema to visible content builds trust with AI engines rather than looking generic or spammy.",
      severity: "pass",
    });
  } else {
    findings.push({
      bucket: "technical_schema",
      title: "Schema type doesn't match detected content type",
      detail: `Found: ${Array.from(types).join(", ") || "none"}. Expected one of: ${expected.join(", ")}.`,
      why: "Mismatched schema erodes trust — don't mark up what isn't actually there on the page.",
      severity: "warning",
    });
  }

  const hasIds = jsonLd.some((b) => typeof b["@id"] === "string");
  findings.push({
    bucket: "technical_schema",
    title: hasIds ? "Stable @id references present" : "No stable @id references",
    detail: hasIds
      ? "Article/author/organization entities use stable @id values."
      : "Schema blocks don't declare @id, making it harder to reference the same entity consistently across pages.",
    why: "Stable IDs let AI engines connect this page's entities to other mentions of the same author/organization across the site.",
    severity: hasIds ? "pass" : "warning",
  });

  return findings;
}
