import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * A Card means something specific — "this is one bounded output" (one
 * metric, one chart, one panel) — never generic decoration
 * (frontend_design_system.md §7). Border-first elevation: a hairline
 * border at rest, no shadow unless explicitly raised.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--card-radius)] border border-[var(--card-border)] bg-surface p-[var(--card-padding)]',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 pb-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-medium text-ink-primary', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-ink-secondary', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}
