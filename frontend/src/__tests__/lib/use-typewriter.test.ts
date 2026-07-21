import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTypewriter } from '@/hooks/use-typewriter';

const TEXT = 'If you had invested — what would it be worth today?';

function mockBackForwardNavigation() {
  Object.defineProperty(window, 'navigation', {
    value: { activation: { navigationType: 'traverse' } },
    configurable: true,
  });
}

/**
 * Fully deterministic via fake timers (3D-4 deflake): the hook's timeline is
 * `requestAnimationFrame` + `performance.now()` + one `setTimeout`, so all
 * three are faked and advanced explicitly. The previous real-timer version
 * raced 20-60ms animation windows against wall-clock `waitFor`/`setTimeout`
 * polling and reddened CI under load.
 */
beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

/** Advance the fake clock frame-by-frame so every scheduled rAF actually fires. */
function advanceFrames(count: number, frameMs = 16) {
  for (let i = 0; i < count; i += 1) {
    act(() => {
      vi.advanceTimersByTime(frameMs);
    });
  }
}

describe('useTypewriter', () => {
  it('reduced motion (active=false): renders the full text instantly, with no cursor, on the very first render', () => {
    const { result } = renderHook(() => useTypewriter(TEXT, false, { duration: 30, cursorBlinkMs: 10 }));

    expect(result.current.text).toBe(TEXT);
    expect(result.current.showCursor).toBe(false);

    // Advancing far past what would have been the animation changes nothing.
    advanceFrames(10);
    expect(result.current.text).toBe(TEXT);
    expect(result.current.showCursor).toBe(false);
  });

  it('active: starts empty (nothing typed yet) with the cursor visible', () => {
    const { result } = renderHook(() => useTypewriter(TEXT, true, { duration: 200, cursorBlinkMs: 10 }));
    expect(result.current.text).toBe('');
    expect(result.current.showCursor).toBe(true);
  });

  it('active: reveals the text forward-only and settles on the exact full string, once', () => {
    const { result } = renderHook(() => useTypewriter(TEXT, true, { duration: 160, cursorBlinkMs: 10 }));

    let previousLength = 0;
    for (let frame = 0; frame < 15; frame += 1) {
      advanceFrames(1);
      const { text } = result.current;
      // Forward-only: never deletes, always a prefix of the final string.
      expect(TEXT.startsWith(text)).toBe(true);
      expect(text.length).toBeGreaterThanOrEqual(previousLength);
      previousLength = text.length;
    }

    expect(result.current.text).toBe(TEXT);

    // Settled: further frames never change the revealed text.
    advanceFrames(5);
    expect(result.current.text).toBe(TEXT);
  });

  it('active: the cursor blinks (stays present) immediately after typing completes, then hides permanently', () => {
    const { result } = renderHook(() => useTypewriter(TEXT, true, { duration: 32, cursorBlinkMs: 100 }));

    // Typing completes within a few frames; the cursor must still be showing.
    advanceFrames(4);
    expect(result.current.text).toBe(TEXT);
    expect(result.current.showCursor).toBe(true);

    // CURSOR_BLINKS (2) x cursorBlinkMs after completion, it hides for good.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.showCursor).toBe(false);
    expect(result.current.text).toBe(TEXT);

    // Stays hidden — never reappears, never restarts.
    advanceFrames(10);
    expect(result.current.showCursor).toBe(false);
    expect(result.current.text).toBe(TEXT);
  });

  it('runs once per mount — a `text` reference change from a parent re-render does not restart typing', () => {
    const { result, rerender } = renderHook(({ value }) => useTypewriter(value, true, { duration: 200, cursorBlinkMs: 10 }), {
      initialProps: { value: TEXT },
    });

    const firstRenderText = result.current.text;
    rerender({ value: `${TEXT}`.slice(0) });
    expect(result.current.text).toBe(firstRenderText);
  });

  describe('M7 Phase 3D-6 — back/forward navigation', () => {
    afterEach(() => {
      // @ts-expect-error -- test-only cleanup of a property mockBackForwardNavigation defines.
      delete window.navigation;
    });

    it('renders the full text instantly on a back/forward traversal, even though `active` is true — the Landing hero never retypes on revisit', () => {
      mockBackForwardNavigation();
      const { result } = renderHook(() => useTypewriter(TEXT, true, { duration: 200, cursorBlinkMs: 10 }));

      expect(result.current.text).toBe(TEXT);
      expect(result.current.showCursor).toBe(false);

      advanceFrames(5);
      expect(result.current.text).toBe(TEXT);
    });
  });
});
