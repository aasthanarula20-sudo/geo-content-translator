import type { ExtractedContent, Finding } from "../types";

const BOILERPLATE_AUTHOR = /^(admin|administrator|staff|team|editor|webmaster)$/i;

export function checkAuthorBox(extracted: ExtractedContent): Finding {
  if (extracted.authorSignals.length === 0) {
    return {
      bucket: "entity_credibility",
      title: "No author byline found",
      detail: "No author name, byline, or credential text detected on the page.",
      why: "AI engines weigh visible credibility signals (E-E-A-T) when deciding whether a source is safe to cite.",
      severity: "fail",
    };
  }
  const isBoilerplate = extracted.authorSignals.some((s) => BOILERPLATE_AUTHOR.test(s.trim()));
  return {
    bucket: "entity_credibility",
    title: isBoilerplate ? "Author byline is boilerplate" : "Author byline found",
    detail: `Detected: ${extracted.authorSignals.join(" · ")}`,
    why: isBoilerplate
      ? "A generic 'Admin'/'Staff' byline provides no real credibility signal — a real name with credentials is stronger."
      : "A named author with visible credentials strengthens trust signals AI engines use when deciding what to cite.",
    severity: isBoilerplate ? "warning" : "pass",
  };
}

export function checkLastUpdated(extracted: ExtractedContent): Finding {
  if (extracted.lastUpdatedSignals.length === 0) {
    return {
      bucket: "freshness_fanout",
      title: "No visible last-updated date",
      detail: "No date or 'last updated' text found on the page.",
      why: "Freshness signals matter directly for time-sensitive facts (prices, rules, timelines) that AI engines check before citing.",
      severity: "fail",
    };
  }
  return {
    bucket: "freshness_fanout",
    title: "Last-updated / date signal present",
    detail: `Detected: ${extracted.lastUpdatedSignals.join(" · ")}`,
    why: "A visible, current date reassures both readers and AI engines that facts (prices, rules, timelines) are current.",
    severity: "pass",
  };
}
