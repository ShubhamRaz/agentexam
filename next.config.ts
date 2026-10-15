import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Keep heavy Node-only parsers out of the Turbopack bundle — importing
  // pdf-parse/mammoth through the dev bundler silently fails (empty text),
  // so they must stay external and be required at runtime.
  serverExternalPackages: ["pdf-parse", "mammoth", "sharp"],
};

export default nextConfig;
