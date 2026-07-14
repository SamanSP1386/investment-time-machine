import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useMagnetic } from '@/hooks/use-magnetic';

/**
 * Same controllable-rAF technique as `use-proximity-rows.test.ts` — "the
 * loop settles and stops scheduling" is a directly observable assertion
 * here, not an inference from elapsed wall-clock time.
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

function settle(raf: ReturnType<typeof mockRaf>) {
  let iterations = 0;
  while (raf.pendingCount() > 0 && iterations < 500) {
    act(() => raf.flush());
    iterations += 1;
  }
  return iterations;
}

/** `getBoundingClientRect` is globally stubbed (vitest.setup.ts) to a fixed
 * `{top:0,left:0,width:600,height:300}` rect — every element's center is
 * therefore (300, 150) in every test in this suite. */
function TestTarget({ enabled }: { enabled: boolean }) {
  const ref = useMagnetic<HTMLDivElement>(enabled);
  return <div ref={ref} data-testid="magnetic-el" />;
}

function movePointer(clientX: number, clientY: number) {
  document.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY, bubbles: true }));
}

describe('useMagnetic', () => {
  it('disabled: attaches no listener — a nearby pointermove schedules no frame at all', () => {
    const raf = mockRaf();
    render(<TestTarget enabled={false} />);

    act(() => movePointer(340, 150)); // 40px from the (300,150) center — well inside the 80px radius
    expect(raf.pendingCount()).toBe(0);
  });

  it('enabled: a pointer within the ~80px radius pulls the element by at most 6px, then the loop settles and stops', () => {
    const raf = mockRaf();
    const { getByTestId } = render(<TestTarget enabled />);
    const el = getByTestId('magnetic-el');

    act(() => movePointer(340, 150)); // 40px away — inside the radius
    expect(raf.pendingCount()).toBe(1);

    const iterations = settle(raf);
    expect(iterations).toBeLessThan(500); // actually converged, not just exhausted the safety cap
    expect(raf.pendingCount()).toBe(0);

    const x = Number.parseFloat(el.style.getPropertyValue('--magnetic-x'));
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThanOrEqual(6);
    expect(el.style.getPropertyValue('--magnetic-y')).toBe('0px');
  });

  it('enabled: a pointer outside the ~80px radius produces no pull', () => {
    const raf = mockRaf();
    const { getByTestId } = render(<TestTarget enabled />);
    const el = getByTestId('magnetic-el');

    act(() => movePointer(600, 150)); // 300px away — well outside the radius
    settle(raf);

    expect(el.style.getPropertyValue('--magnetic-x')).toBe('0px');
    expect(el.style.getPropertyValue('--magnetic-y')).toBe('0px');
  });

  it('enabled: leaving the element resets the pull and converges back to zero — no perpetual loop at rest', () => {
    const raf = mockRaf();
    const { getByTestId } = render(<TestTarget enabled />);
    const el = getByTestId('magnetic-el');

    act(() => movePointer(340, 150));
    settle(raf);
    expect(Number.parseFloat(el.style.getPropertyValue('--magnetic-x'))).toBeGreaterThan(0);

    act(() => {
      el.dispatchEvent(new MouseEvent('pointerleave', { bubbles: false }));
    });
    expect(raf.pendingCount()).toBe(1);
    const iterations = settle(raf);
    expect(iterations).toBeLessThan(500);
    expect(raf.pendingCount()).toBe(0);
    expect(el.style.getPropertyValue('--magnetic-x')).toBe('0px');
  });

  it('unmounting clears the custom properties rather than leaving a stale offset behind', () => {
    const raf = mockRaf();
    const { getByTestId, unmount } = render(<TestTarget enabled />);
    const el = getByTestId('magnetic-el');

    act(() => movePointer(340, 150));
    settle(raf);
    expect(el.style.getPropertyValue('--magnetic-x')).not.toBe('');

    unmount();
    expect(el.style.getPropertyValue('--magnetic-x')).toBe('');
    expect(el.style.getPropertyValue('--magnetic-y')).toBe('');
  });
});
