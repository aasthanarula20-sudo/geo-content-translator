import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import type { ExtractedContent } from "./types";

const LAST_UPDATED_RE =
  /(last updated|updated on|updated:|published on|publish date|date modified)/i;
const AUTHOR_RE = /(author|byline|written by|reviewed by)/i;

export function extractContent(html: string, url: string): ExtractedContent {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const reader = new Readability(document, { keepClasses: false });
  const article = reader.parse();

  const articleHtml = article?.content || html;
  const title = article?.title || document.title || "Untitled page";
  const textContent = (article?.textContent || document.body?.textContent || "").trim();

  const $article = cheerio.load(articleHtml);
  const $full = cheerio.load(html);

  const headings: { level: number; text: string }[] = [];
  $article("h1,h2,h3,h4,h5,h6").each((_, el) => {
    const level = Number(el.tagName.replace(/[^0-9]/g, "")) || 2;
    const text = $article(el).text().trim();
    if (text) headings.push({ level, text });
  });

  const images: { alt: string | null; src: string }[] = [];
  $article("img").each((_, el) => {
    const alt = $article(el).attr("alt") ?? null;
    const src = $article(el).attr("src") || "";
    images.push({ alt, src });
  });

  const origin = new URL(url).origin;
  const internalLinks: { text: string; href: string }[] = [];
  $article("a[href]").each((_, el) => {
    const href = $article(el).attr("href") || "";
    let resolved = href;
    try {
      resolved = new URL(href, url).toString();
    } catch {
      // relative/invalid href, keep as-is
    }
    if (resolved.startsWith(origin) || href.startsWith("/")) {
      internalLinks.push({ text: $article(el).text().trim(), href: resolved });
    }
  });

  const hasTable = $article("table").length > 0;
  const hasNumberedList = $article("ol").length > 0;

  // FAQ-like heuristic: question-shaped headings followed by a short answer paragraph.
  let faqLikePairs = 0;
  $article("h2,h3,h4").each((_, el) => {
    const text = $article(el).text().trim();
    if (text.endsWith("?")) faqLikePairs += 1;
  });
  faqLikePairs += $article("dt").length;

  const jsonLd: Record<string, unknown>[] = [];
  $full('script[type="application/ld+json"]').each((_, el) => {
    const raw = $full(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) jsonLd.push(...parsed);
      else jsonLd.push(parsed);
    } catch {
      // malformed JSON-LD block, skip
    }
  });

  const authorSignals: string[] = [];
  if (article?.byline) authorSignals.push(article.byline);
  $full('[class*="author"], [itemprop="author"], [rel="author"]').each((_, el) => {
    const text = $full(el).text().trim();
    if (text && text.length < 200) authorSignals.push(text);
  });

  const lastUpdatedSignals: string[] = [];
  $full("time").each((_, el) => {
    const datetime = $full(el).attr("datetime") || $full(el).text().trim();
    if (datetime) lastUpdatedSignals.push(datetime);
  });
  const bodyText = $full("body").text();
  const match = bodyText.match(new RegExp(`.{0,20}${LAST_UPDATED_RE.source}.{0,40}`, "i"));
  if (match) lastUpdatedSignals.push(match[0].trim());

  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  return {
    title,
    textContent,
    contentHtml: articleHtml,
    wordCount,
    headings,
    images,
    internalLinks,
    hasTable,
    hasNumberedList,
    faqLikePairs,
    jsonLd,
    authorSignals: Array.from(new Set(authorSignals)).slice(0, 5),
    lastUpdatedSignals: Array.from(new Set(lastUpdatedSignals)).slice(0, 5),
  };
}

export function extractFromRawText(rawText: string): ExtractedContent {
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const headings = rawText
    .split("\n")
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => {
      const level = line.match(/^#+/)?.[0].length || 2;
      return { level, text: line.replace(/^#+\s*/, "").trim() };
    });

  return {
    title: headings[0]?.text || "Pasted content",
    textContent: rawText,
    contentHtml: `<pre>${rawText}</pre>`,
    wordCount,
    headings,
    images: [],
    internalLinks: [],
    hasTable: /\|.+\|.+\|/.test(rawText),
    hasNumberedList: /^\s*\d+\.\s/m.test(rawText),
    faqLikePairs: headings.filter((h) => h.text.endsWith("?")).length,
    jsonLd: [],
    authorSignals: [],
    lastUpdatedSignals: [],
  };
}

export { AUTHOR_RE, LAST_UPDATED_RE };
