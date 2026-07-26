export class FetchPageError extends Error {
  constructor(
    message: string,
    public code: "invalid_url" | "not_found" | "blocked" | "timeout" | "network"
  ) {
    super(message);
    this.name = "FetchPageError";
  }
}

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; GEOContentOptimizer/1.0; +https://example.com/bot)";

export function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchPage(url: string): Promise<{ html: string; finalUrl: string }> {
  if (!isValidUrl(url)) {
    throw new FetchPageError("Not a valid http(s) URL.", "invalid_url");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (res.status === 404 || res.status === 410) {
      throw new FetchPageError(`Page returned ${res.status}.`, "not_found");
    }
    if (res.status === 403 || res.status === 401 || res.status === 429) {
      throw new FetchPageError(`Page blocked the request (HTTP ${res.status}).`, "blocked");
    }
    if (!res.ok) {
      throw new FetchPageError(`Page returned HTTP ${res.status}.`, "not_found");
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("text")) {
      throw new FetchPageError("Response was not HTML/text content.", "blocked");
    }

    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } catch (err) {
    if (err instanceof FetchPageError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchPageError("Timed out fetching the page.", "timeout");
    }
    throw new FetchPageError("Network error fetching the page.", "network");
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRobotsAndLlmsTxt(pageUrl: string) {
  const origin = new URL(pageUrl).origin;
  const fetchText = async (path: string): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${origin}${path}`, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      clearTimeout(t);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  };

  const [robotsTxt, llmsTxt] = await Promise.all([
    fetchText("/robots.txt"),
    fetchText("/llms.txt"),
  ]);

  return { robotsTxt, llmsTxt };
}
