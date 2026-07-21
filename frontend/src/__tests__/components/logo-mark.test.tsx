import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LogoMark } from '@/components/shell/logo-mark';

/**
 * M7 Phase 3D-6 (final touch pass, logo integration). Covers the two
 * standing rules from LogoMark's own doc comment: (1) always decorative —
 * no accessible name of its own, since every real call site pairs it with
 * adjacent visible text; (2) never animated — no call site may be able to
 * add motion this component doesn't itself gate, so the mark's own markup
 * must carry no animation/transition class or inline style by construction.
 */
describe('LogoMark', () => {
  it('is a single filled path, no raster/image, no stroke', () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(1);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('is always decorative — aria-hidden, no role or accessible name, so it never duplicates adjacent visible text', () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden');
    expect(svg).not.toHaveAttribute('role');
    expect(svg).not.toHaveAttribute('aria-label');
  });

  it('never animates — no animation/transition utility class on the root element by default', () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class') ?? '').not.toMatch(/animate|transition|spin/);
  });

  it('forwards a caller className (e.g. sizing/color) onto the root element', () => {
    const { container } = render(<LogoMark className="h-4 w-4 text-accent" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4', 'text-accent');
  });
});
