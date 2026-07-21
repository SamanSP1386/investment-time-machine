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
  // M7 Phase 3D-6 (final touch pass, page transitions) — enables React's
  // <ViewTransition> integration with App Router navigations (root layout
  // wraps {children} in one, `globals.css` supplies the crossfade timing).
  // Browsers without the View Transitions API are unaffected: per Next's
  // own docs, "without browser support, your application works normally,
  // the transitions simply do not animate" — an instant swap, no separate
  // fallback code needed.
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
