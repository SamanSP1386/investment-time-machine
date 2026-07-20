import type { ReactNode } from 'react';
import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';
import { SHELL_CONTAINER_CLASS } from './shell-geometry';
import { cn } from '@/lib/utils';

/**
 * The shared product-route shell (M7 Phase 3D-1, task A + C.12) — composes
 * the header, main content, and footer, and is the ONE place the elevated
 * atmosphere (`.itm-elevated`, `globals.css`) is painted: on this
 * full-width, full-height outer wrapper, not on each page's own content
 * container. That's what makes the atmosphere full-bleed (task C.12) — it
 * covers the entire viewport at any width, with no black margin outside the
 * reading column and no visible seam between "content background" and
 * "page background," because they're now the same element. Every descendant
 * still reads the elevated palette correctly (`bg-background`,
 * `text-ink-primary`, ...) since those are CSS custom properties, which
 * inherit down through the DOM regardless of which ancestor actually
 * painted the `background-image`.
 *
 * Used by every real product route — `/`, `/simulator`, `/simulation/[id]`,
 * `/about`, and the not-found/error boundaries — so every page shares the
 * exact same atmosphere/header/footer/geometry. `/dev/playground` remains
 * unwrapped, unchanged, by construction — it is a component-isolation
 * harness, not a product route.
 */
export function ProductShell({
  children,
  calculationVersion,
  contentClassName,
}: {
  children: ReactNode;
  calculationVersion?: string;
  /** Vertical rhythm and layout only (`py-*`, `gap-*`, `flex`...) — the horizontal measure is the shell's own, never a page's. */
  contentClassName?: string;
}) {
  return (
    <div className="itm-elevated flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className={cn(SHELL_CONTAINER_CLASS, 'flex-1', contentClassName)}>{children}</main>
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
