import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These are Node-only DOM/HTML libraries with deep native-ish dependency
  // trees that the bundler shouldn't try to inline into the serverless
  // function. Load them as plain Node require()s at runtime instead.
  serverExternalPackages: ["jsdom", "cheerio", "@mozilla/readability"],
};

export default nextConfig;
