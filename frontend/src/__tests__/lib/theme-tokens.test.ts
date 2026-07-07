import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ADR-028 fixed a real, shipped bug: `semantic.css` once declared
 * `--color-status-good: var(--color-status-good)` — a custom property
 * referencing its own name, invalid per the CSS Custom Properties spec,
 * which silently broke Badge's status colors. `globals.css`'s `@theme
 * inline` block deliberately contains lines that *look* identical
 * (`--color-background: var(--color-background)`) but are Tailwind v4's
 * documented namespace-bridging mechanism, not a bug — the left-hand name
 * lives in Tailwind's theme namespace, the right-hand `var()` resolves
 * against the real value `semantic.css` already declared in the global
 * custom-property cascade.
 *
 * This is the permanent regression guard distinguishing the two: it
 * asserts every `@theme inline` self-looking declaration is confined to
 * globals.css's intentional bridge block, and separately asserts
 * semantic.css itself — where the real bug lived — never contains one.
 */

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function findSelfReferencingDeclarations(source: string): string[] {
  const code = stripCssComments(source);
  const matches = code.matchAll(/(--[\w-]+)\s*:\s*var\(\s*(--[\w-]+)\s*\)/g);
  const selfReferencing: string[] = [];
  for (const match of matches) {
    const [, declaredName, referencedName] = match;
    if (declaredName === referencedName) {
      selfReferencing.push(declaredName);
    }
  }
  return selfReferencing;
}

describe('theme token self-reference regression guard (ADR-028)', () => {
  it('semantic.css — where the real ADR-028 bug lived — never self-references a custom property', () => {
    const source = readFileSync(join(projectRoot, 'styles/tokens/semantic.css'), 'utf-8');
    expect(findSelfReferencingDeclarations(source)).toEqual([]);
  });

  it('components.css never self-references a custom property', () => {
    const source = readFileSync(join(projectRoot, 'styles/tokens/components.css'), 'utf-8');
    expect(findSelfReferencingDeclarations(source)).toEqual([]);
  });

  it('primitives.css never self-references a custom property', () => {
    const source = readFileSync(join(projectRoot, 'styles/tokens/primitives.css'), 'utf-8');
    expect(findSelfReferencingDeclarations(source)).toEqual([]);
  });

  it('globals.css only self-references inside the documented @theme inline bridge block', () => {
    const source = readFileSync(join(projectRoot, 'app/globals.css'), 'utf-8');
    const themeInlineMatch = source.match(/@theme inline\s*\{([\s\S]*?)\n\}/);
    expect(themeInlineMatch).not.toBeNull();

    const themeInlineBlock = themeInlineMatch![1];
    const outsideThemeInline = source.replace(themeInlineMatch![0], '');

    // Every self-referencing line found anywhere in the file must live
    // inside the @theme inline block — none outside it.
    expect(findSelfReferencingDeclarations(outsideThemeInline)).toEqual([]);

    // The bridge block itself is expected to contain self-looking lines —
    // this documents that expectation so a future contributor sees this
    // test fail (and this comment) rather than "fixing" them.
    expect(findSelfReferencingDeclarations(themeInlineBlock).length).toBeGreaterThan(0);
  });
});
