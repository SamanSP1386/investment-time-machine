import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Every empty state is informative, never a bare blank area
 * (frontend_design_system.md §10) — e.g. asset search's "no results" is an
 * explicit 200 OK per api_design.md, not an error, and should read that way.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--card-radius)] border border-dashed border-border-hairline p-12 text-center',
        className
      )}
    >
      <Icon aria-hidden className="h-8 w-8 text-ink-muted" />
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-secondary">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
