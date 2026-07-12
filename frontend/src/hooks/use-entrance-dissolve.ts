'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/**
 * The Results page's blur-to-sharp entrance (M7 Phase 3D-2, item 14,
 * FD-018-compliant amendment to Founder Decision 017's immediate-render
 * principle) — content is never gated behind this: `active`/`dissolved`
 * only ever control a CSS `filter`/`opacity` transition layered on top of
 * content that is already fully rendered and readable, never a delay
 * before it appears (mirrors `useSettleIn`'s existing contract, ADR-041).
 *
 * "First arrival per simulation only" (never on a back-navigation
 * revisit) is tracked via `sessionStorage`, keyed by simulation id — a
 * plain per-mount `useState` isn't enough, since navigating
 * Results -> Simulator -> back to the same Results id is a fresh React
 * mount each time. `sessionStorage` (not `localStorage`) deliberately
 * resets the "seen" set per browser tab session, matching "arrival"
 * rather than "ever, permanently."
 */
const SEEN_KEY_PREFIX = 'itm-results-entrance-seen:';

function hasSeen(id: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.sessionStorage.getItem(SEEN_KEY_PREFIX + id) === '1';
  } catch {
    // Storage unavailable (private-mode Safari, etc.) — treat as unseen;
    // worst case the dissolve replays on a later revisit, never a data or
    // accessibility problem.
    return false;
  }
}

function markSeen(id: string): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY_PREFIX + id, '1');
  } catch {
    // Ignore — see hasSeen.
  }
}

export function useEntranceDissolve(id: string): { active: boolean; dissolved: boolean } {
  const reducedMotion = useReducedMotion();
  const [alreadySeen] = useState(() => hasSeen(id));
  const active = !reducedMotion && !alreadySeen;
  const [dissolved, setDissolved] = useState(!active);

  useEffect(() => {
    markSeen(id);
    if (!active) return undefined;
    // Two rAFs, matching useSettleIn's established pattern: the first commits
    // the initial blurred/dim paint, the second flips to the settled class on
    // the following frame so there is a real "from" state to transition out of.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setDissolved(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `active`/`id` are stable for the lifetime of this mount (id is a route param, active is captured once via the lazy useState above).
  }, []);

  return { active, dissolved };
}
