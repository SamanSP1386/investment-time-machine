import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSettleIn } from '@/hooks/use-settle-in';

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

describe('useSettleIn', () => {
  it('starts (and stays) settled immediately when inactive — no animation frame scheduled', async () => {
    const { result } = renderHook(() => useSettleIn(false));

    expect(result.current).toBe(true);

    await act(async () => {
      await nextFrame();
      await nextFrame();
    });
    expect(result.current).toBe(true);
  });

  it('starts unsettled when active, then settles after the transition is given a frame to start from', async () => {
    const { result } = renderHook(() => useSettleIn(true));

    expect(result.current).toBe(false);

    await act(async () => {
      await nextFrame();
      await nextFrame();
    });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('captures `active` once at mount — a later change to the argument never retriggers or interrupts it', () => {
    const { result, rerender } = renderHook(({ active }) => useSettleIn(active), {
      initialProps: { active: false },
    });

    expect(result.current).toBe(true);

    rerender({ active: true });
    // Still settled — the inactive capture at mount is permanent for this
    // mount's lifetime, not re-evaluated on every render.
    expect(result.current).toBe(true);
  });
});
