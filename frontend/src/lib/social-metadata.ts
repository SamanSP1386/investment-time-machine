import type { Metadata } from 'next';

/**
 * M7 Phase 3D-5 (item 4) — the one place the social-card (Open Graph +
 * Twitter) metadata shape lives. Verified against this Next version's real
 * rendered output, not assumed: the `opengraph-image.png` FILE convention
 * only attaches the image to its own route segment (`/` got the meta tags;
 * `/about` and `/simulation/[id]` rendered none), and a route defining its
 * own `openGraph` object shallowly replaces the root layout's whole
 * `openGraph` — so the image must travel inside every route's own
 * `openGraph`/`twitter` objects. This helper is how; every route with
 * social metadata composes it from here. URLs are relative — the root
 * layout's `metadataBase` makes them absolute, which crawlers require.
 *
 * The image itself (`public/og-default.png`, 1200x630) is a static,
 * checked-in asset in the product's own design language, regenerated only
 * by `scripts/generate-og-image.mjs` when the design changes.
 */
export const SOCIAL_IMAGE = {
  url: '/og-default.png',
  width: 1200,
  height: 630,
  alt: 'Investment Time Machine — If you had invested, what would it be worth today? A deterministic historical simulation. Real market data. Never advice.',
} as const;

export function socialMetadata({
  title,
  description,
}: {
  title: string;
  description: string;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: { title, description, images: [SOCIAL_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [SOCIAL_IMAGE.url] },
  };
}
