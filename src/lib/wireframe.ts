import type { ContentType } from "./types";

export function buildWireframeAnnotations(contentType: ContentType) {
  const structuredElementNote =
    contentType === "comparison" || contentType === "product_pricing"
      ? "Comparison table with fixed criteria — lets an AI engine extract a clean side-by-side."
      : contentType === "faq_support"
        ? "Numbered troubleshooting/resolution steps, if the page describes a procedure."
        : "Numbered steps or a comparison table, whichever fits this content type.";

  return [
    {
      block: "Executive definition",
      note: "Above the fold — must answer the core query directly so it can be lifted as a standalone answer.",
    },
    { block: "Structured element", note: structuredElementNote },
    {
      block: "Answer unit blocks",
      note: "One per supporting claim, each following Claim -> Context -> Evidence -> Takeaway.",
    },
    {
      block: "Contextual CTA",
      note: "Placed at a natural decision point in the content, not a generic top/bottom banner.",
    },
    { block: "Mini-FAQ block", note: "3-5 Q&A pairs, schema-ready for FAQPage markup." },
    {
      block: "Credibility layer",
      note: "Author box, organization details, last-updated stamp, scope/watch-outs line.",
    },
    { block: "Closing CTA", note: "Second, distinct call-to-action near the end of the page." },
    {
      block: "Schema/metadata appendix",
      note: "Suggested schema.org type plus stable @id and about/mentions entity guidance.",
    },
  ];
}
