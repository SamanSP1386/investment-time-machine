'use client';

import { useEffect, useState } from 'react';
import { isBackForwardNavigation } from '@/lib/navigation-history';

/**
 * How often the still-cycling (unlocked) digits re-randomize, in ms — a
 * scramble that re-rolls every animation frame (~16ms) reads as an
 * illegible blur rather than a legible "cycling digits" effect. FD-018.1
 * (M7 Phase 3D-3, item 3): slowed to a readable "tick" rate, independent of
 * the overall duration/easing (which still governs how many characters are
 * locked at any given moment, via `eased`).
 */
const CYCLE_TICK_MS = 55;

/**
 * FD-018 rule 1, amended by FD-018.1 (M7 Phase 3D-3, item 3) — a digits-only
 * scramble/settle on a financial figure, originally ported from the
 * approved mockup's own `Component.scramble()`. Runs exactly once per
 * mount: progressive left-to-right character lock, ease-out, non-digit
 * characters (`$`, `,`, `.`, `%`, `+`, `−`, spaces, letters) never cycle —
 * they are locked from the very first frame, only digits scramble.
 *
 * FD-018.1 adds: the still-cycling digits render at a legible ~55ms tick
 * rate (not a full-framerate blur) and get a subtle, constant accent glow
 * WHILE cycling (`cycling: true`) — not only the brighter pulse after
 * settle (`glow: true` for 650ms, unchanged in kind, just now visually
 * distinct from the in-progress glow a caller applies at a lower
 * intensity). Both glow states are caller-rendered (this hook only reports
 * phase booleans), so the exact glow pixel/opacity value stays a per-call-
 * site concern (hero figures vs. supporting stats use different
 * intensities) — never intensity-scaled by a result's sign (FD-018 rule 6,
 * unchanged).
 *
 * `active` is captured once via a lazy `useState` initializer, mirroring
 * `useSettleIn`'s established pattern (ADR-041) — a later
 * `prefers-reduced-motion` change mid-session does not retrigger or
 * interrupt an already-decided mount. When `active` is `false` at mount,
 * the lazy initializer alone already produces the final `target` text, so
 * no effect runs at all for that case: the FIRST render already shows
 * `target` with no intermediate scrambled state ever observable (FD-018
 * rule 5's test-enforced hard gate).
 *
 * M7 Phase 3D-6 (page transitions) — the same initializer also checks
 * `isBackForwardNavigation()`, matching `useSettleIn`'s own addition: a
 * browser back/forward traversal shows the final `target` text immediately,
 * with no scramble, so the Results entrance never replays on a back/forward
 * revisit. See `useSettleIn`'s doc comment for the full rationale.
 */
export function useScramble(
  target: string,
  active: boolean,
  { duration, delay = 0 }: { duration: number; delay?: number }
): { text: string; glow: boolean; cycling: boolean } {
  const [wasActive] = useState(() => active && !isBackForwardNavigation());
  const [state, setState] = useState(() => ({
    text: wasActive ? scrambleAt(target, 0) : target,
    glow: false,
    cycling: wasActive,
  }));

  useEffect(() => {
    if (!wasActive) {
      return undefined;
    }

    let rafId = 0;
    let startTimeoutId = 0;
    let glowTimeoutId = 0;
    let lastTick = -1;

    function step(startTime: number) {
      rafId = requestAnimationFrame(() => {
        // Deliberately re-reads performance.now() here rather than using
        // the timestamp requestAnimationFrame passes its callback: that
        // argument is not guaranteed to share performance.now()'s epoch in
        // every environment (observed directly under jsdom, where the two
        // diverge enough that the animation would otherwise never reach
        // raw === 1) — calling performance.now() again is the portable,
        // spec-safe way to measure elapsed time against a startTime that
        // was itself captured via performance.now().
        const elapsed = performance.now() - startTime;
        const raw = Math.min(1, elapsed / duration);
        const eased = 1 - (1 - raw) ** 3;
        const done = raw === 1;
        if (!done) {
          // Only actually re-render on a tick boundary (CYCLE_TICK_MS) —
          // still checked every animation frame so the tick fires as close
          // to on-time as the browser's own frame cadence allows, but the
          // *content* of unlocked digits stays legible-still between ticks
          // rather than re-rolling on every ~16ms frame.
          const tick = Math.floor(elapsed / CYCLE_TICK_MS);
          if (tick !== lastTick) {
            lastTick = tick;
            setState({ text: scrambleAt(target, eased), glow: false, cycling: true });
          }
          step(startTime);
        } else {
          setState({ text: target, glow: true, cycling: false });
          glowTimeoutId = window.setTimeout(
            () => setState({ text: target, glow: false, cycling: false }),
            650
          );
        }
      });
    }

    startTimeoutId = window.setTimeout(() => step(performance.now()), delay);

    return () => {
      window.clearTimeout(startTimeoutId);
      window.clearTimeout(glowTimeoutId);
      cancelAnimationFrame(rafId);
    };
    // Deliberately once-per-mount only (FD-018 rule 1: "runs ONCE per page
    // load"), matching useSettleIn's own established pattern (ADR-041) —
    // `target`/`duration`/`delay` are stable per mount (a completed
    // simulation's own figures never change in place), and `wasActive`
    // itself never changes after the lazy initializer captures it once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasActive]);

  return state;
}

function scrambleAt(target: string, progress: number): string {
  const locked = Math.floor(progress * target.length);
  let out = '';
  // eslint-disable-next-line no-restricted-syntax -- character-index loop bound, not a DecimalString comparison (ADR-033).
  for (let i = 0; i < target.length; i += 1) {
    const ch = target[i];
    // eslint-disable-next-line no-restricted-syntax -- character-index comparison, not a DecimalString comparison (ADR-033).
    out += i < locked || !/[0-9]/.test(ch) ? ch : String(Math.floor(Math.random() * 10));
  }
  return out;
}
