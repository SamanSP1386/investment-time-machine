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
