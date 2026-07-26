"use client";

import { useState } from "react";

interface Props {
  onSubmitUrl: (url: string) => void;
  onSubmitRawText: (text: string) => void;
  disabled: boolean;
  suggestPaste: boolean;
  errorMessage: string | null;
}

export function UrlInputForm({ onSubmitUrl, onSubmitRawText, disabled, suggestPaste, errorMessage }: Props) {
  const [url, setUrl] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [rawText, setRawText] = useState("");

  const isValid = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pasteMode) {
      if (rawText.trim().length > 0) onSubmitRawText(rawText.trim());
    } else if (isValid(url)) {
      onSubmitUrl(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          GEO Content Optimizer
        </h1>
        <button
          type="button"
          onClick={() => setPasteMode((v) => !v)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          disabled={disabled}
        >
          {pasteMode ? "Use a URL instead" : "Paste content instead"}
        </button>
      </div>

      {!pasteMode ? (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/your-page"
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the page's text or HTML here..."
          disabled={disabled}
          rows={8}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {errorMessage}
          {suggestPaste && !pasteMode && (
            <button
              type="button"
              onClick={() => setPasteMode(true)}
              className="ml-2 underline font-medium"
            >
              Paste the content instead
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || (pasteMode ? rawText.trim().length === 0 : !isValid(url))}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 transition-colors"
      >
        {disabled ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}
