import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom/cheerio/readability use dynamic requires that Next's bundler can
  // mishandle when packaging serverless functions, causing an instant
  // FUNCTION_INVOCATION_FAILED crash on Vercel (with zero outgoing requests)
  // that doesn't reproduce in local dev/build. Keep them as plain Node
  // require()s at runtime instead of bundling them.
  serverExternalPackages: ["jsdom", "cheerio", "@mozilla/readability"],
};

export default nextConfig;
