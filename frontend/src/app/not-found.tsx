import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { ProductShell } from '@/components/shell/product-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button-variants';

/**
 * M7 Phase 3D-4 (item 5, cross-page coherence audit) — previously a bare,
 * unwrapped div: no `ProductShell`, so no header, no footer, no atmosphere
 * (`.itm-elevated`) — the one page in the product that looked like a
 * different, unstyled application. Wrapped like every other real route now,
 * so a 404 still reads as *this* product having a plain, honest gap, not as
 * the product having broken entirely.
 */
export default function NotFound() {
  return (
    <ProductShell contentClassName="max-w-2xl flex min-h-[60vh] flex-col items-center justify-center gap-8 p-6 sm:p-10">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link href="/" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            Back to the front page
          </Link>
        }
      />
    </ProductShell>
  );
}
