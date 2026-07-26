const FEATURES = [
  {
    icon: "📊",
    title: "GEO Score & Findings",
    description:
      "A weighted score across content substance, structure, credibility, freshness, and schema — plus specific, prioritized fixes.",
  },
  {
    icon: "✍️",
    title: "GEO-Optimized Rewrite",
    description:
      "A ready-to-publish Markdown rewrite of your page, structured the way AI answer engines actually extract and cite content.",
  },
  {
    icon: "🧩",
    title: "Annotated Wireframe",
    description:
      "A visual layout showing exactly where each block belongs and why — the structural blueprint behind the rewrite.",
  },
];

const STEPS = ["Fetch page", "Analyze with Claude", "Score & prioritize", "Generate rewrite"];

export function FeatureHighlights() {
  return (
    <div className="w-full max-w-4xl flex flex-col gap-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-5 flex flex-col gap-2"
          >
            <span className="text-2xl">{f.icon}</span>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{f.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{f.description}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
          What happens when you click Analyze
        </p>
        <div className="flex items-center flex-wrap justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {STEPS.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1">
                {step}
              </span>
              {i < STEPS.length - 1 && <span className="text-slate-300 dark:text-slate-700">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
