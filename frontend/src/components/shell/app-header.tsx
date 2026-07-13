'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_LINKS = [{ href: '/simulator', label: 'Simulator' }] as const;

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
 * `maxWidthClassName` is threaded down from `ProductShell`, which derives it
 * from the current page's own content column, so the header's inner
 * container always lines up with the content beneath it instead of a
 * hardcoded width that only matched some pages.
 */
export function AppHeader({ maxWidthClassName = 'max-w-[1200px]' }: { maxWidthClassName?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border-hairline bg-background/85 backdrop-blur-md">
      <div className={cn('mx-auto flex items-center justify-between px-6 py-5 sm:px-10', maxWidthClassName)}>
        <Link href="/" className="font-serif text-lg text-ink-primary italic">
          Investment Time Machine
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'kicker transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)] hover:text-ink-primary',
                  active ? 'text-ink-primary' : 'text-ink-muted'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
