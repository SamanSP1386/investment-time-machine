import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Tailwind v4's built-in theme ships five breakpoints (sm/md/lg/xl/2xl).
 * frontend_design_system.md §12 approves exactly three (sm/md/lg, at
 * 640/1024/1440px) — `@theme inline` redeclaring those three keys does not
 * remove the built-in xl/2xl, since it only overrides matching keys.
 * ADR-034 resets the whole `--breakpoint-*` namespace before redeclaring
 * the approved three, so `xl:`/`2xl:` utilities cannot silently exist.
 * This is the permanent regression guard for that decision.
 */

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '../..');

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    // __tests__ is excluded: its prose (like this very file's own
    // docstring, which necessarily mentions "xl:"/"2xl:" as literal
    // strings) would otherwise false-positive against itself.
    if (entry.isDirectory() && entry.name === '__tests__') return [];
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    if (/\.(ts|tsx|css)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

describe('breakpoint namespace lock (ADR-034)', () => {
  it('globals.css resets --breakpoint-* before redeclaring the three approved breakpoints', () => {
    const source = readFileSync(join(srcDir, 'app/globals.css'), 'utf-8');
    const resetIndex = source.indexOf('--breakpoint-*: initial');
    const smIndex = source.indexOf('--breakpoint-sm:');
    const mdIndex = source.indexOf('--breakpoint-md:');
    const lgIndex = source.indexOf('--breakpoint-lg:');

    expect(resetIndex).toBeGreaterThan(-1);
    expect(smIndex).toBeGreaterThan(resetIndex);
    expect(mdIndex).toBeGreaterThan(resetIndex);
    expect(lgIndex).toBeGreaterThan(resetIndex);
  });

  it('no xl:/2xl: breakpoint variant utility appears anywhere in src/', () => {
    const files = listSourceFiles(srcDir);
    const offenders: string[] = [];

    for (const file of files) {
      const raw = readFileSync(file, 'utf-8');
      // Strip comments first — explanatory prose (like this codebase's own
      // ADR-034 comment in globals.css, or a JSDoc block) may legitimately
      // mention "xl:"/"2xl:" as documentation of what NOT to use, which
      // would otherwise trip this same scan as a false positive (the same
      // technique format.test.ts's guardrail test already uses).
      const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (/(?:^|[\s"'`{])(?:xl|2xl):/.test(code)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});
