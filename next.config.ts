import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — an unrelated lockfile at /Users/truth otherwise
  // makes Next.js infer the wrong root directory.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
