import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shaped like the final layout it stands in for, never a generic spinner
 * (frontend_design_system.md §10). Uses `.skeleton-shimmer` (globals.css) —
 * a one-shot, two-pass sweep, never Tailwind's `animate-pulse` (infinite by
 * default, a direct FD-018 motion-law violation) — frozen to its static
 * resting color under `prefers-reduced-motion` by the same global override
 * every other animation in this app uses.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton-shimmer rounded-[var(--skeleton-radius)]', className)}
      {...props}
    />
  );
}
