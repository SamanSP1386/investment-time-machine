'use client';

import { useEffect, useRef } from 'react';

/**
 * Magnetic primary CTAs (M7 Phase 3D-4, item 10) — a subtle pull toward the
 * cursor within ~80px proximity, ease-out return once the cursor leaves.
 * Same architecture as `use-proximity-rows.ts`: a per-frame `requestAnimationFrame`
 * loop lerps a current value toward a target and stops rescheduling itself
 * the moment it settles — no `setInterval`, no ambient per-frame work at
 * rest. Applied to exactly two elements in the product (the Simulator's
 * "Run simulation" button, the Landing page's primary CTA), never as a
 * general-purpose hover effect.
 *
 * The returned ref is meant for a plain wrapper element around the actual
 * `Button`/`Link` — not the interactive element itself — deliberately, so
 * this hook's own JS-lerped `translate` never composes with (and gets
 * doubly-smoothed by) `buttonVariants`' own CSS `transition-[...,transform]`
 * governing the press `active:scale-[0.98]` state. Two independent,
 * single-purpose transforms on two different elements, not one shared,
 * harder-to-reason-about transform pipeline.
 */
const RADIUS_PX = 80;
const MAX_PULL_PX = 6;
const LERP_RATE = 0.22;
const EPSILON_PX = 0.05;

export function useMagnetic<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);
  const current = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  function tick() {
    rafId.current = null;
    const el = ref.current;
    if (!el) return;

    const dx = target.current.x - current.current.x;
    const dy = target.current.y - current.current.y;
    // eslint-disable-next-line no-restricted-syntax -- pixel-offset epsilon comparison, not a DecimalString comparison (ADR-033).
    const settled = Math.abs(dx) < EPSILON_PX && Math.abs(dy) < EPSILON_PX;
    current.current = settled
      ? { x: target.current.x, y: target.current.y }
      : { x: current.current.x + dx * LERP_RATE, y: current.current.y + dy * LERP_RATE };

    el.style.setProperty('--magnetic-x', `${current.current.x}px`);
    el.style.setProperty('--magnetic-y', `${current.current.y}px`);

    if (!settled) {
      rafId.current = requestAnimationFrame(tick);
    }
  }

  function scheduleFrame() {
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(tick);
    }
  }

  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    function handlePointerMove(event: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // eslint-disable-next-line no-restricted-syntax -- pixel-distance comparison, not a DecimalString comparison (ADR-033).
      if (distance > RADIUS_PX || distance === 0) {
        target.current = { x: 0, y: 0 };
      } else {
        const pull = (1 - distance / RADIUS_PX) * MAX_PULL_PX;
        target.current = { x: (dx / distance) * pull, y: (dy / distance) * pull };
      }
      scheduleFrame();
    }

    function handlePointerLeave() {
      target.current = { x: 0, y: 0 };
      scheduleFrame();
    }

    // Document-level, not element-level: the whole point of an ~80px
    // proximity radius is reacting BEFORE the cursor is actually over the
    // (typically smaller) button — an element-scoped listener would only
    // ever see pointer events once already inside its own box.
    document.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerleave', handlePointerLeave);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      // Reset instantly on unmount/disable — no lingering offset if this
      // element unmounts mid-pull (e.g. the Simulator swaps to its loading
      // interstitial while the cursor is still nearby).
      el.style.removeProperty('--magnetic-x');
      el.style.removeProperty('--magnetic-y');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `scheduleFrame`/`tick` close over refs only and are stable for the component's lifetime, matching `use-proximity-rows.ts`'s identical, already-established precedent for this exact shape of rAF loop.
  }, [enabled]);

  return ref;
}
