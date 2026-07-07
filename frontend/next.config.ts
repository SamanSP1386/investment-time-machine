import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An unrelated package-lock.json in the user's home directory (outside
  // this repo) makes Next.js infer the wrong workspace root; pin it
  // explicitly rather than relying on lockfile auto-detection.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
