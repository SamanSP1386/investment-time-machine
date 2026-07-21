import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { IBM_Plex_Mono, Newsreader, Public_Sans } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import { THEME_INIT_SCRIPT } from '@/providers/theme-script';
import { socialMetadata } from '@/lib/social-metadata';
import './globals.css';

/**
 * M7 Phase 3D — Design Elevation (FD-018, ADR-044). Replaces Inter/JetBrains
 * Mono with the approved mockup's font stack, self-hosted via
 * next/font/google (no external font CDN at runtime — next/font downloads
 * and serves the font files from this app's own origin at build time).
 * Newsreader is new (display serif, the worked-example sentence); Public
 * Sans replaces Inter (body); IBM Plex Mono replaces JetBrains Mono
 * (figures/mono — every financial figure app-wide, via the `.figure`
 * class in globals.css).
 */
const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

/**
 * M7 Phase 3D-5 (item 4) — Open Graph / social cards. `metadataBase` makes
 * every relative metadata URL (the shared `og-default.png` card each
 * route's `socialMetadata()` references) resolve to an absolute URL, which
 * social crawlers require. `NEXT_PUBLIC_SITE_URL` must be set on a real
 * deployment; the localhost fallback exists only so local dev/build works.
 * Routes with their own `metadata`/`generateMetadata` compose their own
 * og/twitter fields via `socialMetadata()` (a child `openGraph` shallowly
 * replaces this one — see social-metadata.ts); this root object covers any
 * route that doesn't, e.g. the not-found boundary.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const SITE_TITLE = 'Investment Time Machine';
const SITE_DESCRIPTION = 'Understand historical investment outcomes — precisely, and without hype.';
const rootSocial = socialMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: { type: 'website', siteName: SITE_TITLE, ...rootSocial.openGraph },
  twitter: rootSocial.twitter,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${publicSans.variable} ${ibmPlexMono.variable} ${newsreader.variable} h-full`}
    >
      <head>
        {/* Runs before first paint — see src/providers/theme-script.ts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full antialiased">
        <AppProviders>
          {/*
           * M7 Phase 3D-6 (final touch pass, page transitions) — the ONE
           * app-wide View Transition wrapper: unifies every route pair
           * (landing<->simulator<->results<->about<->error/not-found) on a
           * quick crossfade, per `next.config.ts`'s
           * `experimental.viewTransition` flag. `default="auto"` is React's
           * own built-in crossfade activation for any transition without a
           * more specific name — deliberately no custom keyframes here: the
           * View Transitions spec's own default UA animation for an
           * unnamed root transition is already a 250ms crossfade, which
           * sits inside the requested ~200-250ms window with no bespoke
           * CSS to maintain. There is no shared-element `name` on this
           * wrapper since nothing persists identity across a full route
           * change here (every route swaps its entire `ProductShell`,
           * header included — see that component's own doc comment on why
           * no nested layout persists across routes in this app).
           *
           * This is the only `<ViewTransition>` in the tree — no page or
           * component nests another one — so there is exactly one thing to
           * compose with the Results page's own richer entrance
           * (`useSettleIn`/`useScramble`), never a second, stacked
           * page-level transition: this wrapper crossfades the page
           * SNAPSHOT (old pixels -> new pixels, ~250ms), while the
           * newly-mounted Results components' own component-level
           * settle/scramble run as an independent layer on top of the live
           * DOM, not a second View-Transition-driven effect — the two
           * compose rather than double-fire the same mechanism.
           * Back/forward navigation still gets this crossfade (a generic,
           * appropriate treatment for any navigation) but never replays the
           * Results/Landing entrance choreography — see
           * `use-settle-in.ts`/`use-scramble.ts`/`use-typewriter.ts` and
           * `lib/navigation-history.ts`.
           *
           * Feature-detected by the browser itself, per Next's own
           * viewTransition guide: unsupported browsers render normally
           * with an instant swap, no separate fallback code needed.
           * `prefers-reduced-motion` is handled in `globals.css`, since the
           * View Transition pseudo-element tree isn't reachable by the
           * existing `*`-selector override (it targets real DOM nodes
           * only).
           */}
          <ViewTransition default="auto">{children}</ViewTransition>
        </AppProviders>
      </body>
    </html>
  );
}
