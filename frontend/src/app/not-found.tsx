import Link from 'next/link';
import { LogoMark } from '@/components/shell/logo-mark';
import { ProductShell } from '@/components/shell/product-shell';
import { buttonVariants } from '@/components/ui/button-variants';

/**
 * M7 Phase 3D-5 (item 6) — the 404 as an editorial page in the product's
 * own voice, not a generic icon-card empty state: a serif heading in
 * character ("This page returned no data."), one line of plain explanation,
 * and the two places worth going next. Same shell, same atmosphere, same
 * geometry as every real route (item 1), so a dead link still lands the
 * reader inside the product rather than in a different-looking application.
 * No stack traces, no default Next.js screen — by construction.
 */
export default function NotFound() {
  return (
    <ProductShell contentClassName="flex flex-col gap-8 py-16 sm:py-24">
      <div className="flex flex-col gap-6">
        {/* Bare mark, quiet (M7 Phase 3D-6) — the header above already
            carries the wordmark lockup, so this is a small, decorative
            signature reinforcing "you're still inside the product," not a
            second brand statement. */}
        <LogoMark className="h-6 w-6 text-ink-muted" />
        <p className="kicker">404 — Not found</p>
        <h1 className="max-w-4xl font-serif text-[clamp(2rem,2.8vw+1rem,3.25rem)] leading-tight font-medium text-ink-primary">
          This page returned no data.
        </h1>
        <p className="max-w-prose text-base text-ink-secondary">
          The address you followed doesn&rsquo;t match anything here — it may have been mistyped, moved, or it may
          never have existed. Nothing you were working on is affected.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/simulator" className={buttonVariants({ variant: 'primary' })}>
            Run a simulation
          </Link>
          <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
            Back to the front page
          </Link>
        </div>
      </div>
    </ProductShell>
  );
}
