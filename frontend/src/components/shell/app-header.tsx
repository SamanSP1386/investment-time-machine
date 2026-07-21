'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from './logo-mark';
import { SHELL_CONTAINER_CLASS } from './shell-geometry';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/simulator', label: 'Simulator' },
  { href: '/about', label: 'About' },
] as const;

/**
 * The minimal editorial product header (M7 Phase 3D-1, Craft & Coherence,
 * task A.1) — a Newsreader wordmark, one quiet nav link, a hairline bottom
 * rule.
 *
 * Sticky by choice, not by default: the Results page can run long (hero →
 * Supporting Facts → chart → Why → The Proof), and a persistent way back to
 * the Simulator without scrolling to the top is a real, small convenience
 * for a returning/exploring reader.
 *
 * M7 Phase 3D-2 (bug 2) regression fix: the header was fully
 * "atmosphere-transparent" (no background at all), which read as intended
 * only while the page underneath hadn't scrolled — the instant it had, page
 * content scrolled directly under and visually collided with the header's
 * own text. A translucent scroll backdrop (the page's own surface tint,
 * blurred) fixes the collision while staying quiet — it's still a thin
 * hairline rule doing the visual separation, not a filled opaque bar.
 *
 * M7 Phase 3D-5 (item 1): the per-page `maxWidthClassName` threading is
 * gone — it existed only because pages carried different column widths, the
 * very inconsistency the unified shell measure removes. The header's inner
 * container is now `SHELL_CONTAINER_CLASS`, the same single geometry the
 * main column and footer use, so it lines up with the content beneath it on
 * every route by construction.
 */
export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border-hairline-strong">
      {/*
       * The bar's own translucent blur backdrop lives on this dedicated
       * layer, NOT on the <header> element (3D-4 reality-gap fix): an
       * element with `backdrop-filter` becomes a "backdrop root" for its
       * descendants, so while `backdrop-blur-md` sat on the header itself,
       * the item-9 melt strip below — also a `backdrop-filter` child —
       * could only sample content painted inside the header's own group
       * (nothing, below the bar) instead of the page scrolling beneath,
       * and rendered literally no pixels (verified via headless-Chrome A/B
       * screenshots, max channel delta 8/255 even under an extreme
       * blur+invert probe). As siblings, both layers sample the real page.
       */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-background/85 backdrop-blur-md" />
      {/*
       * M7 Phase 3D-4, item 13 — `flex-wrap` (plus a vertical gap for the
       * wrapped case) is the "simple stacked... if needed" fallback the
       * task itself names: at a narrow-enough mobile width where the full
       * "Investment Time Machine" wordmark and both nav links can't share
       * one row, the nav wraps to its own line below the wordmark instead
       * of overlapping or forcing horizontal scroll — structurally
       * guaranteed by the layout itself, not a single hand-picked
       * breakpoint guess. The wordmark's own responsive size (`text-base
       * sm:text-lg`) and the nav's tighter mobile gap (`gap-4 sm:gap-6`)
       * both make that fallback less likely to ever trigger in practice.
       */}
      <div
        className={cn(SHELL_CONTAINER_CLASS, 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-5')}
      >
        {/*
         * Navbar lockup (M7 Phase 3D-6, final touch pass) — the spiral mark
         * plus the existing wordmark, one `Link` so the whole lockup is one
         * click target (matching how the mark-only footer/error-page uses
         * stay bare). `h-[1.15em] w-[1.15em]` sizes the mark off the
         * wordmark's own font-size (its `em` is this row's, since neither
         * element sets its own font-size) so it tracks the `text-base
         * sm:text-lg` responsive step automatically rather than needing a
         * second breakpoint pair. `text-accent`: the mark is gold in both
         * themes via the existing `--color-accent` remap inside
         * `.itm-elevated` (§16's single point of control), never a
         * hand-picked hex here. Static only — see LogoMark's own doc
         * comment for the standing "never animates" rule.
         */}
        <Link href="/" className="flex items-center gap-2 font-serif text-base text-ink-primary italic sm:text-lg">
          <LogoMark className="h-[1.15em] w-[1.15em] shrink-0 text-accent" />
          Investment Time Machine
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4 sm:gap-6">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group kicker relative pb-1 transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)] hover:text-ink-primary',
                  active ? 'text-ink-primary' : 'text-ink-muted'
                )}
              >
                {link.label}
                {/* Underline draw (item 13) — a hairline bar that scales in
                    from the left on hover/focus, ~150ms ease-out; permanently
                    drawn (not animated) for the active route via `active` —
                    the same "state change may be instant, only the ANIMATION
                    is gated" pattern this codebase already applies everywhere
                    else (prefers-reduced-motion collapses the transition
                    duration globally, so this needs no separate branch). */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-accent transition-transform duration-150 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100',
                    active && 'scale-x-100'
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
      {/*
       * M7 Phase 3D-4, item 9 — a gradual edge blur beneath the header:
       * content scrolling underneath fades from fully blurred (right at the
       * header's own hard edge) to fully sharp over ~40px, so the boundary
       * reads as a melt rather than the abrupt cutoff `backdrop-blur-md`
       * alone produces on the header bar itself. `absolute top-full` anchors
       * it to the header's own actual rendered height (never a guessed
       * pixel constant) since `header` is already a positioning context via
       * `sticky`. Purely decorative and static — no animation, nothing to
       * gate under `prefers-reduced-motion` (FD-018 rule 4's "static
       * atmosphere only" already covers a non-animated backdrop-filter).
       * `pointer-events-none` so it never intercepts a click/hover meant for
       * the content scrolling beneath it.
       */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-10 backdrop-blur-sm [mask-image:linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
    </header>
  );
}
