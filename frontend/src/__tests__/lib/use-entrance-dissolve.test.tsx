import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEntranceDissolve } from '@/hooks/use-entrance-dissolve';

function setReducedMotion(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

describe('useEntranceDissolve', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setReducedMotion(false);
  });

  it('is active and starts undissolved on a first arrival, then settles', async () => {
    const { result } = renderHook(() => useEntranceDissolve('sim-a'));

    expect(result.current.active).toBe(true);
    expect(result.current.dissolved).toBe(false);

    await act(async () => {
      await nextFrame();
      await nextFrame();
    });
    await waitFor(() => expect(result.current.dissolved).toBe(true));
  });

  it('is fully inactive under prefers-reduced-motion — never renders a blurred starting state', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useEntranceDissolve('sim-b'));

    expect(result.current.active).toBe(false);
    expect(result.current.dissolved).toBe(true);
  });

  it('never replays on a later mount for the same simulation id (no back-navigation replay)', () => {
    const { result: first } = renderHook(() => useEntranceDissolve('sim-c'));
    expect(first.current.active).toBe(true);

    // A second, independent mount for the SAME id (e.g. navigating away and
    // back) — sessionStorage already marks it seen.
    const { result: second } = renderHook(() => useEntranceDissolve('sim-c'));
    expect(second.current.active).toBe(false);
    expect(second.current.dissolved).toBe(true);
  });

  it('treats a different simulation id as its own first arrival', () => {
    renderHook(() => useEntranceDissolve('sim-d'));
    const { result } = renderHook(() => useEntranceDissolve('sim-e'));
    expect(result.current.active).toBe(true);
  });
});
