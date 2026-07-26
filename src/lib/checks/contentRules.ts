import readability from "text-readability";
import type { ExtractedContent, Finding } from "../types";

const GENERIC_LINK_TEXT = new Set([
  "click here",
  "here",
  "read more",
  "learn more",
  "this link",
  "this page",
  "more",
  "link",
]);

const GENERIC_ALT_PATTERNS = [/^image$/i, /^photo$/i, /^picture$/i, /^img\d*$/i, /\.(jpg|jpeg|png|gif|webp|svg)$/i, /^$/];

export function checkReadability(text: string): Finding {
  if (text.split(/\s+/).length < 50) {
    return {
      bucket: "content_substance",
      title: "Not enough text to score readability",
      detail: "Page has too little content for a reliable readability score.",
      why: "Readability scoring needs a meaningful sample of running text.",
      severity: "warning",
    };
  }
  const grade = readability.fleschKincaidGrade(text);
  const inRange = grade >= 6 && grade <= 11;
  return {
    bucket: "content_substance",
    title: inRange
      ? `Reading level is in the safe zone (grade ${grade.toFixed(1)})`
      : `Reading level is outside the 8th-10th grade safe zone (grade ${grade.toFixed(1)})`,
    detail: `Flesch-Kincaid grade level: ${grade.toFixed(1)}.`,
    why: "8th-10th grade reading level is a safe zone for both human comprehension and AI parsing; much higher reads as dense/jargon-heavy, much lower can lose necessary nuance.",
    severity: inRange ? "pass" : "warning",
  };
}

export function checkAltText(images: ExtractedContent["images"]): Finding {
  if (images.length === 0) {
    return {
      bucket: "content_substance",
      title: "No images found",
      detail: "No <img> tags detected in the main content.",
      why: "Not applicable — nothing to check.",
      severity: "pass",
    };
  }
  const generic = images.filter(
    (img) => !img.alt || GENERIC_ALT_PATTERNS.some((p) => p.test(img.alt || ""))
  );
  const ratio = generic.length / images.length;
  return {
    bucket: "content_substance",
    title:
      generic.length === 0
        ? "Image alt text is descriptive"
        : `${generic.length} of ${images.length} images have generic or missing alt text`,
    detail:
      generic.length === 0
        ? "All images have descriptive alt text."
        : "Example issue: alt text is empty, a filename, or a generic word like 'image'/'photo' instead of describing what the image shows.",
    why: "AI engines can't interpret images directly — descriptive alt text (and restating chart/graph insights in nearby body text) is often the only way that information reaches an AI answer.",
    severity: ratio === 0 ? "pass" : ratio < 0.5 ? "warning" : "fail",
  };
}

export function checkInternalLinkText(links: ExtractedContent["internalLinks"]): Finding {
  if (links.length === 0) {
    return {
      bucket: "content_substance",
      title: "No internal links found",
      detail: "No internal links detected in the main content.",
      why: "Not applicable — nothing to check.",
      severity: "pass",
    };
  }
  const generic = links.filter((l) => GENERIC_LINK_TEXT.has(l.text.trim().toLowerCase()));
  const ratio = generic.length / links.length;
  return {
    bucket: "content_substance",
    title:
      generic.length === 0
        ? "Internal links use descriptive anchor text"
        : `${generic.length} of ${links.length} internal links use generic anchor text`,
    detail:
      generic.length === 0
        ? "Link text describes the destination rather than using generic phrases."
        : "Examples like 'click here' or 'learn more' give both readers and AI no semantic signal about what the link leads to.",
    why: "Descriptive link text ('explore the feature breakdown') gives AI engines semantic context that generic phrases don't.",
    severity: ratio === 0 ? "pass" : ratio < 0.3 ? "warning" : "fail",
  };
}

export function checkStructuralElements(extracted: ExtractedContent): Finding[] {
  const findings: Finding[] = [];

  const questionHeadings = extracted.headings.filter((h) => h.text.trim().endsWith("?"));
  findings.push({
    bucket: "topic_structure",
    title:
      questionHeadings.length > 0
        ? `${questionHeadings.length} question-shaped heading(s) found`
        : "No question-shaped headings found",
    detail:
      questionHeadings.length > 0
        ? questionHeadings
            .slice(0, 3)
            .map((h) => `"${h.text}"`)
            .join(", ")
        : "Headings are statements rather than questions.",
    why: "Question-shaped headings match how users phrase prompts to AI engines, making the matching section easier to lift as a direct answer.",
    severity: questionHeadings.length > 0 ? "pass" : "warning",
  });

  findings.push({
    bucket: "topic_structure",
    title: extracted.faqLikePairs >= 3 ? "Mini-FAQ present" : "No mini-FAQ block detected",
    detail: `${extracted.faqLikePairs} FAQ-like Q&A pair(s) detected.`,
    why: "A tight 3-5 item mini-FAQ anticipates natural follow-up questions and maps directly to FAQPage schema.",
    severity: extracted.faqLikePairs >= 3 ? "pass" : "warning",
  });

  findings.push({
    bucket: "topic_structure",
    title: extracted.hasTable
      ? "Comparison table present"
      : extracted.hasNumberedList
        ? "Numbered steps present"
        : "No comparison table or numbered steps found",
    detail: extracted.hasTable
      ? "Page includes at least one <table>."
      : extracted.hasNumberedList
        ? "Page includes at least one ordered list."
        : "Neither a comparison table nor numbered steps were found — may be fine for narrative content.",
    why: "Comparison tables and numbered steps are structures AI engines are built to extract cleanly; whether this applies depends on the page's content type.",
    severity: extracted.hasTable || extracted.hasNumberedList ? "pass" : "warning",
  });

  const firstHeadingIndex = extracted.headings.length > 0 ? 0 : -1;
  const executiveDefLikely =
    extracted.textContent.slice(0, 500).split(/\s+/).length > 20 && firstHeadingIndex !== -1;
  findings.push({
    bucket: "content_substance",
    title: executiveDefLikely
      ? "Content opens with a substantive paragraph"
      : "No clear executive definition detected near the top",
    detail: executiveDefLikely
      ? "There is meaningful text before/around the first heading."
      : "Couldn't detect a 2-3 sentence direct-answer definition near the top of the page.",
    why: "A short, direct answer to the core question near the top is the single piece of content most likely to be lifted verbatim into an AI answer.",
    severity: executiveDefLikely ? "pass" : "warning",
  });

  return findings;
}
