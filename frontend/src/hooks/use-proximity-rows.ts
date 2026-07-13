'use client';

import { useEffect, useRef } from 'react';

/** Vertical falloff radius (px) — a row at this distance from the pointer has ~0 proximity. */
const RADIUS_PX = 160;
/** Per-frame convergence rate toward the target value — lower is smoother/slower to settle. */
const LERP_RATE = 0.18;
/** Below this delta from target, a row is treated as fully settled. */
const EPSILON = 0.002;

/**
 * The landing page's proximity-reactive example list (concept adapted from a
 * founder-provided reference, rebuilt in-house — no gsap/ogl/three). Each
 * row gets a smoothed `--proximity` custom property (0..1) driven by pointer
 * distance or keyboard focus, applied directly via `style.setProperty` (not
 * React state) so a `pointermove` never triggers a re-render — only the rAF
 * loop below does, and only while at least one row's value hasn't yet
 * converged on its target.
 *
 * The loop is the literal "settle to zero and stop" requirement: every frame
 * lerps each row's current value toward its target; the moment every row is
 * within `EPSILON` of its target (which is 0 for every row at rest), the
 * loop does not reschedule itself — there is no `setInterval`, no ambient
 * per-frame work once the pointer leaves and the values have decayed to 0.
 */
export function useProximityRows(rowCount: number, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const current = useRef<number[]>(new Array(rowCount).fill(0));
  const target = useRef<number[]>(new Array(rowCount).fill(0));
  const rafId = useRef<number | null>(null);

  function tick() {
    rafId.current = null;
    let settling = false;
    // eslint-disable-next-line no-restricted-syntax -- array-index loop bound, not a DecimalString comparison (ADR-033).
    for (let i = 0; i < rowCount; i += 1) {
      const c = current.current[i];
      const t = target.current[i];
      // eslint-disable-next-line no-restricted-syntax -- 0..1 proximity-value epsilon comparison, not a DecimalString comparison (ADR-033).
      const next = Math.abs(t - c) < EPSILON ? t : c + (t - c) * LERP_RATE;
      current.current[i] = next;
      rowRefs.current[i]?.style.setProperty('--proximity', String(next));
      if (next !== t) settling = true;
    }
    if (settling) {
      rafId.current = requestAnimationFrame(tick);
    }
  }

  function scheduleFrame() {
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(tick);
    }
  }

  function setTarget(index: number, value: number) {
    if (!enabled) return;
    target.current[index] = value;
    scheduleFrame();
  }

  useEffect(() => {
    if (!enabled) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    function handlePointerMove(event: PointerEvent) {
      // eslint-disable-next-line no-restricted-syntax -- array-index loop bound, not a DecimalString comparison (ADR-033).
      for (let i = 0; i < rowCount; i += 1) {
        const el = rowRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(event.clientY - (rect.top + rect.height / 2));
        target.current[i] = Math.max(0, 1 - distance / RADIUS_PX);
      }
      scheduleFrame();
    }

    function handlePointerLeave() {
      // eslint-disable-next-line no-restricted-syntax -- array-index loop bound, not a DecimalString comparison (ADR-033).
      for (let i = 0; i < rowCount; i += 1) target.current[i] = 0;
      scheduleFrame();
    }

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rowCount]);

  return { containerRef, rowRefs, setTarget };
}
