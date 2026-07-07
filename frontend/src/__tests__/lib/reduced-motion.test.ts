import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * jsdom does not run a layout/paint engine, so it cannot verify that
 * `animation-duration`/`transition-duration` are actually reduced to
 * ~0 at runtime under `prefers-reduced-motion: reduce` — that requires a
 * real browser (a future Playwright suite). This is a static check that
 * the global override exists and is unconditional (applies to `*`, not
 * scoped to specific classes that could drift out of sync with new
 * animated components) — the mechanism this project relies on instead of
 * per-component reduced-motion logic (BRAND_CONSTITUTION.md §8).
 */
describe('reduced-motion global override', () => {
  it('globals.css disables animation/transition duration for every element under prefers-reduced-motion', () => {
    const globalsCssPath = join(dirname(fileURLToPath(import.meta.url)), '../../app/globals.css');
    const css = readFileSync(globalsCssPath, 'utf-8');

    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);

    const mediaBlockMatch = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{([\s\S]*?)}\s*}/);
    expect(mediaBlockMatch).not.toBeNull();
    const block = mediaBlockMatch![1];

    expect(block).toContain('*');
    expect(block).toMatch(/animation-duration:\s*0\.01ms/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms/);
  });
});
