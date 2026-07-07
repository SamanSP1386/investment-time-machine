import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * global-error.tsx deliberately renders its own <html>/<body> and imports
 * nothing else (ADR-031's "everything else failed" boundary), so it isn't a
 * good fit for React Testing Library's usual render-into-document approach.
 * A static source scan is the same technique contrast.test.ts uses for
 * known-answer token regressions — this asserts the digest color is the
 * approved, WCAG-AA-safe `--color-ink-muted-light` value (#6b6963), not the
 * old shared #898781 hex that measured 3.41:1 against the light page plane
 * (ADR-028/KI-037).
 */
describe('global-error.tsx digest color', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../app/global-error.tsx'),
    'utf-8'
  );

  it('uses the approved accessible muted color, not the old low-contrast one', () => {
    expect(source).toContain('#6b6963');
    expect(source).not.toContain('#898781');
  });
});
