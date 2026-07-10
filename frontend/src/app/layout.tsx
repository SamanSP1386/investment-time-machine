import type { Metadata } from 'next';
import { IBM_Plex_Mono, Newsreader, Public_Sans } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import { THEME_INIT_SCRIPT } from '@/providers/theme-script';
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

export const metadata: Metadata = {
  title: 'Investment Time Machine',
  description: 'Understand historical investment outcomes — precisely, and without hype.',
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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
