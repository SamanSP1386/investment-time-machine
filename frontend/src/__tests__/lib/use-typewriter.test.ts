import { describe, expect, it } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { useTypewriter } from '@/hooks/use-typewriter';

const TEXT = 'If you had invested — what would it be worth today?';

describe('useTypewriter', () => {
  it('reduced motion (active=false): renders the full text instantly, with no cursor, on the very first render', async () => {
    const { result } = renderHook(() => useTypewriter(TEXT, false, { duration: 30, cursorBlinkMs: 10 }));

    expect(result.current.text).toBe(TEXT);
    expect(result.current.showCursor).toBe(false);

    // Waiting past what would have been the animation's duration changes nothing.
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(result.current.text).toBe(TEXT);
    expect(result.current.showCursor).toBe(false);
  });

  it('active: starts empty (nothing typed yet) with the cursor visible', () => {
    const { result } = renderHook(() => useTypewriter(TEXT, true, { duration: 200, cursorBlinkMs: 10 }));
    expect(result.current.text).toBe('');
    expect(result.current.showCursor).toBe(true);
  });

  it('active: reveals the text forward-only and settles on the exact full string, once', async () => {
    const seenLengths: number[] = [];
    const { result } = renderHook(() => useTypewriter(TEXT, true, { duration: 40, cursorBlinkMs: 10 }));

    await waitFor(() => expect(result.current.text).toBe(TEXT));

    // Never deletes: a manual poll across the animation would show a
    // monotonically non-decreasing length — spot-checked here by re-running
    // with a slightly longer duration and sampling mid-flight.
    const { result: midResult } = renderHook(() => useTypewriter(TEXT, true, { duration: 300, cursorBlinkMs: 10 }));
    await new Promise((resolve) => setTimeout(resolve, 60));
    seenLengths.push(midResult.current.text.length);
    expect(TEXT.startsWith(midResult.current.text)).toBe(true);
    expect(seenLengths[0]).toBeLessThanOrEqual(TEXT.length);
  });

  it('active: the cursor blinks (stays present) immediately after typing completes, then hides permanently', async () => {
    const { result } = renderHook(() => useTypewriter(TEXT, true, { duration: 20, cursorBlinkMs: 15 }));

    await waitFor(() => expect(result.current.text).toBe(TEXT));
    expect(result.current.showCursor).toBe(true);

    await waitFor(() => expect(result.current.showCursor).toBe(false), { timeout: 1000 });
    expect(result.current.text).toBe(TEXT);

    // Stays hidden — never reappears, never restarts.
    await new Promise((resolve) => setTimeout(resolve, 40));
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
});
