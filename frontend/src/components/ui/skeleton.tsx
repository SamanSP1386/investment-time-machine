import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shaped like the final layout it stands in for, never a generic spinner
 * (frontend_design_system.md §10). `animate-pulse` is frozen by the global
 * prefers-reduced-motion override in globals.css.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[var(--skeleton-radius)] bg-border-gridline', className)}
      {...props}
    />
  );
}
