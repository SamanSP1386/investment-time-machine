'use client';

import { useEffect, useState } from 'react';
import { isBackForwardNavigation } from '@/lib/navigation-history';

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
 *
 * M7 Phase 3D-6 (page transitions) — also folds in
 * `isBackForwardNavigation()`: a browser back/forward traversal never plays
 * this settle, even when the caller's own `active` says motion is allowed.
 * This is the composition point with the new app-wide View Transition
 * crossfade (`layout.tsx`) — that crossfade still plays on every
 * navigation, back/forward included, but this component-level entrance
 * does not restack on top of it a second time when the navigation was a
 * traversal, matching the standing "must not replay entrance choreography
 * on back/forward" rule.
 */
export function useSettleIn(active: boolean): boolean {
  const [wasActive] = useState(() => active && !isBackForwardNavigation());
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
