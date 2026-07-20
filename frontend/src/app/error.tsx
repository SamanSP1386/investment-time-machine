'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductShell } from '@/components/shell/product-shell';
import { buttonVariants } from '@/components/ui/button-variants';
import type { RouteErrorBoundaryProps } from '@/lib/next-error-boundary';

/**
 * M7 Phase 3D-5 (item 6) — the route error boundary as an editorial page in
 * the product's own voice, matching `not-found.tsx`: serif heading in
 * character, one plain line, a retry, and the two places worth going next.
 * Same shell/atmosphere/geometry as every real route (item 1). The error
 * digest renders as one quiet mono reference line — support-useful, never a
 * stack trace. `global-error.tsx` is deliberately NOT styled the same way —
 * that boundary's own doc comment explains why it must stay dependency-free
 * (the "everything else failed" fallback can't import the token/provider
 * system this component and `ProductShell` both rely on).
 */
export default function Error({ error, unstable_retry }: RouteErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ProductShell contentClassName="flex flex-col gap-8 py-16 sm:py-24">
      <div className="flex flex-col gap-6">
        <p className="kicker">Something went wrong</p>
        <h1 className="max-w-4xl font-serif text-[clamp(2rem,2.8vw+1rem,3.25rem)] leading-tight font-medium text-ink-primary">
          This page failed to load its answer.
        </h1>
        <p className="max-w-prose text-base text-ink-secondary">
          An unexpected error stopped this page from rendering. Your data and any completed simulation are
          unaffected — every stored result keeps its permanent link.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" onClick={() => unstable_retry()}>
            Try again
          </Button>
          <Link href="/simulator" className={buttonVariants({ variant: 'secondary' })}>
            Run a simulation
          </Link>
          <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
            Back to the front page
          </Link>
        </div>
        {error.digest ? <p className="figure text-xs text-ink-muted">Reference: {error.digest}</p> : null}
      </div>
    </ProductShell>
  );
}
