import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useScramble } from '@/hooks/use-scramble';

/**
 * FD-018 rule 1 (the digits-only scramble/settle) and rule 5 (the
 * `prefers-reduced-motion` hard gate, test-enforced — "no scrambled/
 * intermediate character state may ever be observable under reduced
 * motion"). Uses short synthetic durations, not the production 600ms/450ms
 * values, so this suite runs quickly; the exact production timings are a
 * call-site concern (opening-sequence-heading.tsx/results-sections.tsx),
 * not this hook's own contract.
 */

const TARGET = '$1,234.56';

describe('useScramble', () => {
  it('reduced motion: renders the final target text on the very first render, with no intermediate scrambled state ever observable', async () => {
    const { result, rerender } = renderHook(() => useScramble(TARGET, false, { duration: 30 }));

    // First render — already final, not a placeholder that later corrects itself.
    expect(result.current.text).toBe(TARGET);
    expect(result.current.glow).toBe(false);

    // Re-rendering (e.g. a parent re-render) never introduces a scrambled state.
    rerender();
    expect(result.current.text).toBe(TARGET);

    // Waiting past what would have been the animation's duration changes nothing.
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(result.current.text).toBe(TARGET);
    expect(result.current.glow).toBe(false);
  });

  it('active: non-digit characters are locked from the very first frame — only digits ever cycle', () => {
    const { result } = renderHook(() => useScramble(TARGET, true, { duration: 30 }));

    const initial = result.current.text;
    expect(initial).toHaveLength(TARGET.length);
    for (let i = 0; i < TARGET.length; i += 1) {
      if (!/[0-9]/.test(TARGET[i])) {
        expect(initial[i]).toBe(TARGET[i]);
      }
    }
  });

  it('active: settles to the exact final target text after the animation completes, once, and stays there', async () => {
    const { result } = renderHook(() => useScramble(TARGET, true, { duration: 30 }));

    await waitFor(() => expect(result.current.text).toBe(TARGET));

    // Stays settled — no further scrambling after completion.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(result.current.text).toBe(TARGET);
  });

  it('runs once per mount — a `target` reference change from an unrelated parent re-render does not restart the scramble', () => {
    const { result, rerender } = renderHook(({ value }) => useScramble(value, true, { duration: 30 }), {
      initialProps: { value: TARGET },
    });

    const firstRenderText = result.current.text;

    // Same content, new string instance (simulates a parent recomputing the
    // same formatted figure on every render) — must not reset the animation.
    rerender({ value: `${TARGET}`.slice(0) });
    expect(result.current.text).toBe(firstRenderText);
  });
});
