'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_LINKS = [{ href: '/simulator', label: 'Simulator' }] as const;

/**
 * The minimal editorial product header (M7 Phase 3D-1, Craft & Coherence,
 * task A.1) — a Newsreader wordmark, one quiet nav link, a hairline bottom
 * rule, and no background of its own ("atmosphere-transparent": the
 * full-bleed gradient/grain painted on `ProductShell`'s outer wrapper shows
 * through it, so there is never a visible seam between "header chrome" and
 * "page atmosphere").
 *
 * Sticky by choice, not by default: the Results page can run long (hero →
 * Supporting Facts → chart → Why → The Proof), and a persistent way back to
 * the Simulator without scrolling to the top is a real, small convenience
 * for a returning/exploring reader — the header's own hairline rule stays
 * legible against passing content without an opaque backdrop precisely
 * because it's a thin 1px line, not a filled bar.
 */
export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border-hairline">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/simulator" className="font-serif text-lg text-ink-primary italic">
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
