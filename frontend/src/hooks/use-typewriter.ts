'use client';

import { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 1200;
const DEFAULT_CURSOR_BLINK_MS = 500;
const CURSOR_BLINKS = 2;

/**
 * FD-018.2 — the landing hero's one-shot typewriter. Runs exactly once per
 * mount: reveals `text` over `duration` (~1.2s in production), eased
 * (`raw ** 0.6`) so the first characters land slightly slower before
 * settling into a steady per-char cadence, matching the founder-approved
 * "ease into natural cadence" requirement rather than a constant-speed
 * typewriter. Never deletes, never loops. The cursor blinks twice after
 * typing completes, then hides permanently. `active` is captured once via a
 * lazy `useState` initializer (mirrors `useScramble`/`useSettleIn`,
 * ADR-041) so a mid-session `prefers-reduced-motion` change can't retrigger
 * or interrupt an already-decided mount; when inactive at mount, the first
 * render already shows the final text with no cursor and no scheduled work
 * at all. `duration`/`cursorBlinkMs` default to the founder-approved
 * production values and exist as parameters only so tests can use short
 * synthetic durations (matching `useScramble`'s own `{ duration, delay }`
 * pattern), not because a real call site ever needs a different value.
 */
export function useTypewriter(
  text: string,
  active: boolean,
  { duration = DEFAULT_DURATION_MS, cursorBlinkMs = DEFAULT_CURSOR_BLINK_MS }: { duration?: number; cursorBlinkMs?: number } = {}
): { text: string; showCursor: boolean } {
  const [wasActive] = useState(active);
  const [state, setState] = useState(() => ({
    text: wasActive ? '' : text,
    showCursor: wasActive,
  }));

  useEffect(() => {
    if (!wasActive) {
      return undefined;
    }

    let rafId = 0;
    let cursorTimeoutId = 0;
    const startTime = performance.now();

    function step() {
      rafId = requestAnimationFrame(() => {
        const raw = Math.min(1, (performance.now() - startTime) / duration);
        const eased = raw ** 0.6;
        const chars = Math.floor(eased * text.length);
        // eslint-disable-next-line no-restricted-syntax -- 0..1 animation-progress comparison, not a DecimalString comparison (ADR-033).
        if (raw < 1) {
          setState({ text: text.slice(0, chars), showCursor: true });
          step();
        } else {
          setState({ text, showCursor: true });
          cursorTimeoutId = window.setTimeout(() => setState({ text, showCursor: false }), cursorBlinkMs * CURSOR_BLINKS);
        }
      });
    }
    step();

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(cursorTimeoutId);
    };
    // Deliberately once-per-mount only, matching useScramble/useSettleIn —
    // `text` is a static hero string, never expected to change in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasActive]);

  return state;
}
