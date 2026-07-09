import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOpeningSequence } from '@/hooks/use-opening-sequence';

describe('useOpeningSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts (and stays) fully settled immediately when inactive — no scheduling at all', () => {
    const { result } = renderHook(() => useOpeningSequence(5, false));

    expect(result.current.phase).toBe('settled');
    expect(result.current.visiblePhraseCount).toBe(5);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.phase).toBe('settled');
  });

  it('reveals phrases one at a time, pauses about a second, reveals the answer, then settles', () => {
    const { result } = renderHook(() => useOpeningSequence(5, true));

    expect(result.current.phase).toBe('composing');
    expect(result.current.visiblePhraseCount).toBe(0);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.visiblePhraseCount).toBe(1);

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current.visiblePhraseCount).toBe(5);
    expect(result.current.phase).toBe('paused');

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.phase).toBe('paused');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('answered');

    act(() => {
      vi.advanceTimersByTime(549);
    });
    expect(result.current.phase).toBe('answered');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('settled');
  });

  it('skip jumps straight to the settled end state and cancels any scheduled reveals', () => {
    const { result } = renderHook(() => useOpeningSequence(5, true));

    act(() => {
      result.current.skip();
    });
    expect(result.current.phase).toBe('settled');
    expect(result.current.visiblePhraseCount).toBe(5);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.phase).toBe('settled');
  });
});
