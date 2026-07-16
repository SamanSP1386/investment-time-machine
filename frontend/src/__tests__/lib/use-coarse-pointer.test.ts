import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCoarsePointer } from '@/hooks/use-coarse-pointer';

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

describe('useCoarsePointer (M7 Phase 3D-4 reality-gap fix)', () => {
  it('reports fine on a standard desktop (mouse only)', () => {
    setMatchMedia({ '(any-pointer: fine)': true });
    const { result } = renderHook(() => useCoarsePointer());
    expect(result.current).toBe(false);
  });

  it('reports FINE on a touch-primary convertible that still has a mouse attached — the case `(pointer: coarse)` got wrong and silently disabled items 10/12 hover effects', () => {
    setMatchMedia({ '(pointer: coarse)': true, '(any-pointer: coarse)': true, '(any-pointer: fine)': true });
    const { result } = renderHook(() => useCoarsePointer());
    expect(result.current).toBe(false);
  });

  it('reports coarse only when no fine pointer exists at all (pure touch device)', () => {
    setMatchMedia({ '(pointer: coarse)': true, '(any-pointer: coarse)': true, '(any-pointer: fine)': false });
    const { result } = renderHook(() => useCoarsePointer());
    expect(result.current).toBe(true);
  });
});
