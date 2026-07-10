'use client';

import { useEffect, useState } from 'react';

/**
 * FD-018 rule 1 — a digits-only scramble/settle on a financial figure,
 * ported from the approved mockup's own `Component.scramble()`
 * (`DOCUMENTS_AND_IDEAS/Investment Time Machine Results/Investment Time
 * Machine.dc.html`). Runs exactly once per mount: progressive left-to-right
 * character lock, ease-out, non-digit characters (`$`, `,`, `.`, `%`, `+`,
 * `−`, spaces, letters) never cycle — they are locked from the very first
 * frame, only digits scramble. On completion, `glow` is `true` for 650ms
 * (a caller-driven text-shadow pulse, never intensity-scaled by sign — see
 * FD-018 rule 6) and then settles back to `false`.
 *
 * `active` is captured once via a lazy `useState` initializer, mirroring
 * `useSettleIn`'s established pattern (ADR-041) — a later
 * `prefers-reduced-motion` change mid-session does not retrigger or
 * interrupt an already-decided mount. When `active` is `false` at mount,
 * the lazy initializer alone already produces the final `target` text, so
 * no effect runs at all for that case: the FIRST render already shows
 * `target` with no intermediate scrambled state ever observable (FD-018
 * rule 5's test-enforced hard gate).
 */
export function useScramble(
  target: string,
  active: boolean,
  { duration, delay = 0 }: { duration: number; delay?: number }
): { text: string; glow: boolean } {
  const [wasActive] = useState(active);
  const [state, setState] = useState(() => ({
    text: wasActive ? scrambleAt(target, 0) : target,
    glow: false,
  }));

  useEffect(() => {
    if (!wasActive) {
      return undefined;
    }

    let rafId = 0;
    let startTimeoutId = 0;
    let glowTimeoutId = 0;

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
        const raw = Math.min(1, (performance.now() - startTime) / duration);
        const eased = 1 - (1 - raw) ** 3;
        const done = raw === 1;
        if (!done) {
          setState({ text: scrambleAt(target, eased), glow: false });
          step(startTime);
        } else {
          setState({ text: target, glow: true });
          glowTimeoutId = window.setTimeout(() => setState({ text: target, glow: false }), 650);
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
