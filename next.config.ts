import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // The WebGL post-processing stack does not survive React's development-only
  // double canvas mount reliably; production behavior is unchanged.
  reactStrictMode: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
