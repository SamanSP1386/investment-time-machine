/**
 * M7 Phase 3D-6 (final touch pass, page transitions) — "was the document
 * that is rendering right now reached via browser back/forward?" Backs the
 * standing rule that back/forward navigation must not replay the Results
 * page's richer entrance choreography (`useSettleIn`/`useScramble`, and the
 * Landing hero's `useTypewriter`) while ordinary forward navigation still
 * gets it every time, exactly as FD-017/018 already approve.
 *
 * Built on the Navigation API's `navigation.activation.navigationType`
 * (https://developer.mozilla.org/en-US/docs/Web/API/Navigation/activation),
 * which — unlike a `popstate` listener plus a manually-cleared flag —
 * reports the CURRENT document's own activation type directly, with no
 * timing heuristic needed: it already accounts for same-document
 * (App-Router client-side) navigations, not only full page loads, and
 * needs no listener registered anywhere else in the app to stay correct.
 *
 * Feature-detected, not polyfilled: the Navigation API does not ship in
 * every browser (Safari/Firefox lack it at time of writing). Where it's
 * unavailable this simply returns `false` — the entrance animations play on
 * every mount there, identical to this codebase's behavior before this
 * change, never a regression for those browsers. This is the same
 * feature-detect-with-graceful-degrade shape already used throughout this
 * codebase (`use-reduced-motion.ts`'s `matchMedia`, `use-coarse-pointer.ts`).
 */
export function isBackForwardNavigation(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = (window as unknown as { navigation?: { activation?: { navigationType?: string } } }).navigation;
  return nav?.activation?.navigationType === 'traverse';
}
