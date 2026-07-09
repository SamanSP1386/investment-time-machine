'use client';

import { useEffect, useState } from 'react';

/**
 * The Results heading's one permitted entrance transition (Founder Decision
 * 017, `docs/ARCHITECTURE_DECISIONS.md` ADR-041): a single opacity/translate
 * settle, evaluated once at mount and never replayed for the lifetime of
 * that mount. `active` is captured via a lazy `useState` initializer (a pure
 * read, safe under React Strict Mode's dev double-invocation) rather than
 * tracked live, so a `prefers-reduced-motion` change mid-session cannot
 * retrigger or interrupt an already-decided mount.
 *
 * When `active` is false at mount (reduced motion preferred), this returns
 * `true` immediately with no `requestAnimationFrame` scheduled at all --
 * the caller's content is simply present from the first paint, no
 * transition to disable mid-flight.
 */
export function useSettleIn(active: boolean): boolean {
  const [wasActive] = useState(active);
  const [settled, setSettled] = useState(!wasActive);

  useEffect(() => {
    if (!wasActive) {
      return undefined;
    }
    // Two rAFs: the first lets the browser commit the initial (unsettled)
    // paint; the second flips the class on the following frame so there is
    // a real "from" state to transition out of -- toggling within the same
    // tick as mount would collapse straight to the end state with nothing
    // visibly animating.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setSettled(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [wasActive]);

  return settled;
}
