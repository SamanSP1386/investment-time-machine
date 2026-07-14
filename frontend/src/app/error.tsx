'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ProductShell } from '@/components/shell/product-shell';
import type { RouteErrorBoundaryProps } from '@/lib/next-error-boundary';

/**
 * M7 Phase 3D-4 (item 5, cross-page coherence audit) — previously a bare,
 * unwrapped div, same gap as `not-found.tsx`: no header, no footer, no
 * atmosphere. Wrapped in `ProductShell` like every other real route now.
 * `global-error.tsx` is deliberately NOT changed the same way — that
 * boundary's own doc comment explains why it must stay dependency-free (the
 * "everything else failed" fallback can't import the token/provider system
 * this component and `ProductShell` both rely on).
 */
export default function Error({ error, unstable_retry }: RouteErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ProductShell contentClassName="max-w-2xl flex min-h-[60vh] flex-col items-center justify-center gap-8 p-6 sm:p-10">
      <ErrorState
        title="Something went wrong"
        description="This page couldn't be displayed. Your data and any completed simulation are unaffected."
        requestId={error.digest}
        action={
          <Button variant="secondary" size="sm" onClick={() => unstable_retry()}>
            Try again
          </Button>
        }
      />
    </ProductShell>
  );
}
