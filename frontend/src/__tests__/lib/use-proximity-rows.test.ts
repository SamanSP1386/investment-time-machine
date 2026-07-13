import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProximityRows } from '@/hooks/use-proximity-rows';

/**
 * The Landing page's proximity list must settle to zero and STOP scheduling
 * frames when idle — the literal, test-enforced requirement behind "verify
 * no perpetual frame loop at rest." These tests drive the hook's rAF loop
 * manually via a controllable `requestAnimationFrame` mock rather than real
 * timers, so "the loop stopped" is a directly observable assertion (no more
 * frames were scheduled), not an inference from elapsed wall-clock time.
 */
function mockRaf() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextId;
    nextId += 1;
    callbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    callbacks.delete(id);
  });
  return {
    pendingCount: () => callbacks.size,
    flush() {
      const pending = Array.from(callbacks.entries());
      callbacks.clear();
      for (const [, cb] of pending) cb(0);
    },
  };
}

describe('useProximityRows', () => {
  it('disabled: setTarget is a no-op — no frame is ever scheduled', () => {
    const raf = mockRaf();
    const { result } = renderHook(() => useProximityRows(3, false));

    act(() => result.current.setTarget(0, 1));
    expect(raf.pendingCount()).toBe(0);
  });

  it('enabled: setTarget schedules a frame, and the loop stops rescheduling once the value has converged (settles to zero at rest)', () => {
    const raf = mockRaf();
    const { result } = renderHook(() => useProximityRows(2, true));

    act(() => result.current.setTarget(0, 1));
    expect(raf.pendingCount()).toBe(1);

    // Lerp toward the target — many frames should still be in-flight while
    // converging, but the loop must eventually stop scheduling once close
    // enough (EPSILON) to the target.
    let iterations = 0;
    while (raf.pendingCount() > 0 && iterations < 500) {
      act(() => raf.flush());
      iterations += 1;
    }

    expect(raf.pendingCount()).toBe(0);
    expect(iterations).toBeLessThan(500); // actually converged, not just exhausted the safety cap
  });

  it('enabled: returning to target 0 (pointer leaves / blur) also converges and stops — no perpetual loop at rest', () => {
    const raf = mockRaf();
    const { result } = renderHook(() => useProximityRows(1, true));

    act(() => result.current.setTarget(0, 1));
    for (let i = 0; i < 200 && raf.pendingCount() > 0; i += 1) act(() => raf.flush());
    expect(raf.pendingCount()).toBe(0);

    act(() => result.current.setTarget(0, 0));
    expect(raf.pendingCount()).toBe(1);
    for (let i = 0; i < 200 && raf.pendingCount() > 0; i += 1) act(() => raf.flush());
    expect(raf.pendingCount()).toBe(0);
  });
});
