import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An unrelated package-lock.json in the user's home directory (outside
  // this repo) makes Next.js infer the wrong workspace root; pin it
  // explicitly rather than relying on lockfile auto-detection.
  turbopack: {
    root: path.join(__dirname),
  },
  // The dev-mode build-activity indicator pollutes founder demos (M7 Phase
  // 3D-2, bug 5) — it carries no information a working dev server doesn't
  // already convey via the terminal, and is never present in a production
  // build regardless of this flag.
  devIndicators: false,
};

export default nextConfig;
