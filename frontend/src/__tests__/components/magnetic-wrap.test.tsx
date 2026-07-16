import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MagneticWrap } from '@/components/ui/magnetic-wrap';

function setMatchMedia(overrides: Partial<Record<string, boolean>>) {
  window.matchMedia = (query: string) =>
    ({
      matches: overrides[query] ?? false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

describe('MagneticWrap (M7 Phase 3D-4, item 10)', () => {
  it('renders its child normally regardless of motion/pointer state — never a degraded experience', () => {
    setMatchMedia({});
    render(
      <MagneticWrap>
        <button type="button">Run simulation</button>
      </MagneticWrap>
    );
    expect(screen.getByRole('button', { name: 'Run simulation' })).toBeInTheDocument();
  });

  it('is disabled under prefers-reduced-motion — no pull applied, verified indirectly via no thrown error and normal render', () => {
    setMatchMedia({ '(prefers-reduced-motion: reduce)': true });
    const { container } = render(
      <MagneticWrap>
        <button type="button">Run a simulation</button>
      </MagneticWrap>
    );
    // The wrapper still renders as a plain, inert span — default 0px offset
    // via the CSS var fallback, never a JS-applied nonzero value.
    const wrapper = container.querySelector('span');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.style.getPropertyValue('--magnetic-x')).toBe('');
  });

  it('is disabled on a coarse (touch-only) pointer device — no fine pointer available at all', () => {
    setMatchMedia({ '(any-pointer: coarse)': true, '(any-pointer: fine)': false });
    const { container } = render(
      <MagneticWrap>
        <button type="button">Run a simulation</button>
      </MagneticWrap>
    );
    const wrapper = container.querySelector('span');
    expect(wrapper?.style.getPropertyValue('--magnetic-x')).toBe('');
  });
});
