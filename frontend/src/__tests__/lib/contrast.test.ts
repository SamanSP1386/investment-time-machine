import { describe, expect, it } from 'vitest';

/**
 * WCAG 2.0/2.1 relative-luminance and contrast-ratio formulas
 * (https://www.w3.org/TR/WCAG21/#contrast-minimum), reimplemented here
 * directly (not against a live DOM — jsdom does not load stylesheets or
 * compute real colors) so every ink/status token that is ever used as
 * *text* is a known-answer test against the exact hex values in
 * src/styles/tokens/primitives.css. This is the permanent regression
 * guard for the contrast bug found during M7 Phase 1.5 (ADR-028):
 * ink-muted and three of four status colors failed AA (4.5:1) as text
 * color in at least one theme under the original, single-shared-hex
 * design. If anyone edits a token hex value in the future, this test
 * fails before a low-contrast color ever ships.
 *
 * Chart-series colors are deliberately NOT re-verified here — those are
 * graphical marks governed by the separate dataviz-skill CVD validation
 * referenced in docs/frontend_design_system.md §3, not this text-contrast
 * check.
 */

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const [lighter, darker] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_NORMAL_TEXT = 4.5;

const PAPER_LIGHT = '#f9f9f7';
const PAPER_DARK = '#0d0d0d';
const NAVY_LIGHT = '#1b3a6b';
const NAVY_DARK = '#3e6bb0';

/**
 * M7 Phase 3D — Design Elevation (FD-018/ADR-044). The elevated palette's
 * primitives are declared as oklch() — ported verbatim from the approved
 * mockup, per direct instruction — so relative luminance is computed
 * directly from OKLab, never via a lossy oklch->hex->relinearize round
 * trip. This is the standard OKLab-to-linear-sRGB transform (Björn
 * Ottosson's published matrices); WCAG's relative-luminance coefficients
 * (0.2126/0.7152/0.0722) are the same Rec.709 weights already applied to
 * *linear* RGB above, so no further gamma step is needed once r/g/b below
 * are linear-light values.
 */
function oklchToLinearSrgb(lightness: number, chroma: number, hueDegrees: number): [number, number, number] {
  const hueRadians = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.2914855480 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bChan = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const clamp = (channel: number) => Math.min(1, Math.max(0, channel));
  return [clamp(r), clamp(g), clamp(bChan)];
}

function relativeLuminanceOklch(lightness: number, chroma: number, hueDegrees: number): number {
  const [r, g, b] = oklchToLinearSrgb(lightness, chroma, hueDegrees);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatioOklchVsHex(oklch: [number, number, number], hex: string): number {
  const [lighter, darker] = [relativeLuminanceOklch(...oklch), relativeLuminance(hex)].sort((a, c) => c - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastRatioOklch(a: [number, number, number], b: [number, number, number]): number {
  const [lighter, darker] = [relativeLuminanceOklch(...a), relativeLuminanceOklch(...b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// The elevated (M7 Phase 3D) palette's oklch(L, C, H) primitives, ported
// verbatim from primitives.css — kept as plain tuples here rather than
// imported, matching this file's existing convention of hand-copied,
// known-answer hex literals above (a deliberate, self-contained regression
// guard: if a future edit changes a primitive's value without updating
// this test, the test fails rather than silently trusting the source).
const ELEVATED_BG_DARK_HEX = '#0d141f';
const ELEVATED_BG_LIGHT: [number, number, number] = [0.975, 0.008, 85];
const ELEVATED_INK_PRIMARY_DARK: [number, number, number] = [0.95, 0.015, 85];
const ELEVATED_INK_SECONDARY_DARK: [number, number, number] = [0.85, 0.015, 85];
const ELEVATED_INK_TERTIARY_DARK: [number, number, number] = [0.72, 0.02, 80];
const ELEVATED_INK_MUTED_DARK: [number, number, number] = [0.6, 0.035, 235];
const ELEVATED_INK_PRIMARY_LIGHT: [number, number, number] = [0.2, 0.015, 50];
const ELEVATED_INK_SECONDARY_LIGHT: [number, number, number] = [0.32, 0.015, 50];
const ELEVATED_INK_TERTIARY_LIGHT: [number, number, number] = [0.42, 0.02, 50];
const ELEVATED_INK_MUTED_LIGHT: [number, number, number] = [0.45, 0.02, 50];
const ACCENT_DARK: [number, number, number] = [0.78, 0.13, 82];
const ACCENT_LIGHT: [number, number, number] = [0.4, 0.12, 30];
const NEGATIVE_TINT_DARK: [number, number, number] = [0.66, 0.1, 32];
const NEGATIVE_TINT_LIGHT: [number, number, number] = [0.5, 0.12, 32];

describe('elevated palette text contrast, M7 Phase 3D (WCAG AA, 4.5:1) — FD-018/ADR-044', () => {
  it.each([
    ['elevated ink-primary on elevated bg (dark)', ELEVATED_INK_PRIMARY_DARK],
    ['elevated ink-secondary on elevated bg (dark)', ELEVATED_INK_SECONDARY_DARK],
    ['elevated ink-tertiary on elevated bg (dark)', ELEVATED_INK_TERTIARY_DARK],
    ['elevated ink-muted on elevated bg (dark)', ELEVATED_INK_MUTED_DARK],
    ['accent on elevated bg (dark) — hero figures, links, chart endpoint label', ACCENT_DARK],
    ['negative-tint on elevated bg (dark) — Total Return/CAGR only, never the hero', NEGATIVE_TINT_DARK],
  ] as Array<[string, [number, number, number]]>)('%s meets 4.5:1', (_name, oklch) => {
    expect(contrastRatioOklchVsHex(oklch, ELEVATED_BG_DARK_HEX)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it.each([
    ['elevated ink-primary on elevated bg (light)', ELEVATED_INK_PRIMARY_LIGHT],
    ['elevated ink-secondary on elevated bg (light)', ELEVATED_INK_SECONDARY_LIGHT],
    ['elevated ink-tertiary on elevated bg (light)', ELEVATED_INK_TERTIARY_LIGHT],
    ['elevated ink-muted on elevated bg (light)', ELEVATED_INK_MUTED_LIGHT],
    ['accent on elevated bg (light) — hero figures, links, chart endpoint label', ACCENT_LIGHT],
    ['negative-tint on elevated bg (light) — Total Return/CAGR only, never the hero', NEGATIVE_TINT_LIGHT],
  ] as Array<[string, [number, number, number]]>)('%s meets 4.5:1', (_name, oklch) => {
    expect(contrastRatioOklch(oklch, ELEVATED_BG_LIGHT)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('primary-foreground on the accent-remapped CTA button meets 4.5:1 (dark)', () => {
    // .itm-elevated remaps --color-primary-foreground to the elevated bg
    // tone itself (near-black text on the gold CTA) — see globals.css.
    expect(contrastRatioOklchVsHex(ACCENT_DARK, ELEVATED_BG_DARK_HEX)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('primary-foreground on the accent-remapped CTA button meets 4.5:1 (light)', () => {
    expect(contrastRatioOklch(ACCENT_LIGHT, ELEVATED_BG_LIGHT)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

describe('token text contrast (WCAG AA, 4.5:1)', () => {
  const pairs: Array<[name: string, foreground: string, background: string]> = [
    ['ink-primary on background (light)', '#0b0b0b', PAPER_LIGHT],
    ['ink-secondary on background (light)', '#52514e', PAPER_LIGHT],
    ['ink-muted on background (light)', '#6b6963', PAPER_LIGHT],
    ['ink-primary on background (dark)', '#ffffff', PAPER_DARK],
    ['ink-secondary on background (dark)', '#c3c2b7', PAPER_DARK],
    ['ink-muted on background (dark)', '#898781', PAPER_DARK],
    ['primary-foreground on primary (light)', '#ffffff', NAVY_LIGHT],
    ['primary-foreground on primary (dark)', '#ffffff', NAVY_DARK],
    ['status-good on background (light)', '#0b7d0b', PAPER_LIGHT],
    ['status-good on background (dark)', '#0ca30c', PAPER_DARK],
    ['status-warning on background (light)', '#8a5a00', PAPER_LIGHT],
    ['status-warning on background (dark)', '#fab219', PAPER_DARK],
    ['status-serious on background (light)', '#a8451f', PAPER_LIGHT],
    ['status-serious on background (dark)', '#ec835a', PAPER_DARK],
    ['status-critical on background (light)', '#c23434', PAPER_LIGHT],
    ['status-critical on background (dark)', '#e8605f', PAPER_DARK],
  ];

  it.each(pairs)('%s meets 4.5:1', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('documents the original (pre-ADR-028) single-shared-hex design as a known failure', () => {
    // Historical known-answer values, kept here as evidence the bug was
    // real and specific, not a false alarm from a review process.
    expect(contrastRatio('#898781', PAPER_LIGHT)).toBeLessThan(AA_NORMAL_TEXT); // 3.41:1
    expect(contrastRatio('#0ca30c', PAPER_LIGHT)).toBeLessThan(AA_NORMAL_TEXT); // 3.18:1
    expect(contrastRatio('#fab219', PAPER_LIGHT)).toBeLessThan(AA_NORMAL_TEXT); // 1.74:1
    expect(contrastRatio('#ec835a', PAPER_LIGHT)).toBeLessThan(AA_NORMAL_TEXT); // 2.50:1
    expect(contrastRatio('#d03b3b', PAPER_DARK)).toBeLessThan(AA_NORMAL_TEXT); // 4.05:1
  });
});
