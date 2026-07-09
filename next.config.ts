import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — an unrelated lockfile at /Users/truth otherwise
  // makes Next.js infer the wrong root directory.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Default is 1MB — too small for a 5MB product photo upload.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
