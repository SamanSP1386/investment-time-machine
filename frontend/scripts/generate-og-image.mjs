#!/usr/bin/env node
/**
 * Rasterizes scripts/og-card.html into the static social-card asset
 * `public/og-default.png` (1200x630), referenced on every route via
 * `src/lib/social-metadata.ts` (M7 Phase 3D-5, item 4a). A `public/` asset
 * plus explicit metadata — NOT the `opengraph-image.png` file convention —
 * because this Next version verifiably scopes file-convention images to
 * their own route segment only (see social-metadata.ts's doc comment).
 *
 * Run from frontend/: `node scripts/generate-og-image.mjs`. Requires the
 * Playwright CLI (`npx playwright`) with a Chromium install — a
 * generation-time-only tool dependency, deliberately NOT a package.json
 * dependency: the shipped asset is a static PNG checked into the repo, and
 * this script only ever needs to run again if the card's design changes.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(frontendDir, 'scripts', 'og-card.html');
const ogTarget = path.join(frontendDir, 'public', 'og-default.png');

execFileSync(
  'npx',
  [
    'playwright',
    'screenshot',
    '--viewport-size=1200,630',
    // Generous font-load wait — the card's serif/mono faces come from
    // Google Fonts at generation time (see og-card.html's own comment).
    '--wait-for-timeout=5000',
    source,
    ogTarget,
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' }
);
console.log(`Wrote ${ogTarget}`);
