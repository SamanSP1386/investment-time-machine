import type { ReactNode } from 'react';
import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';
import { cn } from '@/lib/utils';

const DEFAULT_MAX_WIDTH_CLASS = 'max-w-[1120px]';

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
 * Used by `/simulator` and `/simulation/[id]` only — the root `/` and
 * `/dev/playground` pages remain unwrapped, unchanged, by construction.
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
    </div>
  );
}
