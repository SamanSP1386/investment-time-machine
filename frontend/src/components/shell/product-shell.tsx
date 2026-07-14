import type { ReactNode } from 'react';
import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';
import { cn } from '@/lib/utils';

/**
 * M7 Phase 3D-3 (founder review round 2, item 2): raised from 1120px — at
 * desktop/wide viewports the narrower column read as "a strip in a void,"
 * excessive dead margin on both sides. 1200px sits in the founder-specified
 * 1150-1250px range; body prose still caps at `max-w-prose` (65ch, well
 * under the ~70-80ch readability ceiling) regardless of this wider outer
 * column, and the Growth Chart is deliberately allowed to bleed past it
 * (`growth-chart.tsx`).
 */
const DEFAULT_MAX_WIDTH_CLASS = 'max-w-[1200px]';

/**
 * Pulls the single `max-w-*` token out of a page's `contentClassName` so
 * `AppHeader` can size its own inner container to the exact same column
 * (M7 Phase 3D-2, bug 2) instead of a hardcoded constant that only matched
 * some pages (Results' 1120px) and not others (the Simulator's 760px,
 * error/pending states' 2xl) — the mismatch was the actual cause of the
 * header appearing to "pin to the viewport edges" while narrower page
 * content sat in a visibly different column beneath it.
 */
function extractMaxWidthClass(contentClassName?: string): string {
  const match = contentClassName?.match(/(?:^|\s)(max-w-\S+)/);
  return match?.[1] ?? DEFAULT_MAX_WIDTH_CLASS;
}

/**
 * The shared product-route shell (M7 Phase 3D-1, task A + C.12) — composes
 * the header, main content, and footer, and is the ONE place the elevated
 * atmosphere (`.itm-elevated`, `globals.css`) is painted: on this
 * full-width, full-height outer wrapper, not on each page's own
 * `max-w-[...]` content container. That's what makes the atmosphere
 * full-bleed (task C.12) — it covers the entire viewport at any width, with
 * no black margin outside the reading column and no visible seam between
 * "content background" and "page background," because they're now the same
 * element. Every descendant still reads the elevated palette correctly
 * (`bg-background`, `text-ink-primary`, ...) since those are CSS custom
 * properties, which inherit down through the DOM regardless of which
 * ancestor actually painted the `background-image`.
 *
 * Used by every real product route — `/`, `/simulator`, `/simulation/[id]`
 * — so the Landing page shares the exact same atmosphere/header/footer/
 * tokens as the rest of the product rather than a separate marketing shell
 * (M7 Phase 4). `/dev/playground` remains unwrapped, unchanged, by
 * construction — it is a component-isolation harness, not a product route.
 */
export function ProductShell({
  children,
  calculationVersion,
  contentClassName,
}: {
  children: ReactNode;
  calculationVersion?: string;
  contentClassName?: string;
}) {
  return (
    <div className="itm-elevated flex min-h-screen w-full flex-col">
      <AppHeader maxWidthClassName={extractMaxWidthClass(contentClassName)} />
      <main className={cn('mx-auto w-full flex-1', contentClassName)}>{children}</main>
      <AppFooter calculationVersion={calculationVersion} />
      {/*
       * M7 Phase 3D-4, item 9 — a subtle bottom-edge fade, the counterpart
       * to `AppHeader`'s own top melt: a static, fixed, viewport-anchored
       * strip signaling "more page below" while scrolling a long page
       * (Results especially). `position: fixed` (not `sticky`) since it has
       * no in-flow height of its own to reserve — it's a pure visual
       * overlay, `pointer-events-none` so it never blocks a click on real
       * content or the footer beneath it. A plain gradient (not a
       * `backdrop-filter`) — a blurred fixed strip pinned above the
       * ordinary, already-legible footer text would fight its own
       * readability for no benefit a plain fade doesn't already provide.
       * Static, non-animated (FD-018 rule 4).
       */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-sticky)] h-14 [background-image:linear-gradient(to_top,var(--color-background)_0%,transparent_100%)]"
      />
    </div>
  );
}
