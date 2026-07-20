/**
 * M7 Phase 3D-5 (final coherence pass, item 1) — THE page measure, stated
 * once, in its own dependency-free module so `ProductShell`, `AppHeader`,
 * and `AppFooter` can all consume it without an import cycle.
 *
 * Root cause of the pre-3D-5 margin jumps: every route threaded its own
 * `max-w-*` token through `ProductShell`'s `contentClassName`
 * (Landing/Simulator 860px, About 720px, Results 1200px, error/pending
 * states `max-w-2xl`), and `AppHeader` re-derived its width from whichever
 * page it sat on — so both the content column and the header visibly
 * shifted sideways on navigation. The founder prefers the wider
 * Results-style measure: 1200px (inside the specified 1150-1250px range),
 * with one horizontal gutter, shared by header, main column, and footer.
 * Pages pass only vertical rhythm through `contentClassName` — never a
 * width or horizontal padding. Body prose still caps at `max-w-prose`
 * inside the column; the Growth Chart alone may bleed into the gutter
 * (`growth-chart.tsx`).
 */
export const SHELL_MAX_WIDTH_CLASS = 'max-w-[1200px]';
export const SHELL_GUTTER_CLASS = 'px-6 sm:px-10';
export const SHELL_CONTAINER_CLASS = `mx-auto w-full ${SHELL_MAX_WIDTH_CLASS} ${SHELL_GUTTER_CLASS}`;
