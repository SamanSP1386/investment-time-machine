import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title: string;
  description?: string;
  /** api_design.md's error envelope `request_id` — shown small/secondary for support reference, never a stack trace. */
  requestId?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * States what happened in plain language and offers one concrete next
 * action (frontend_design_system.md §10). Never shows raw system detail.
 */
export function ErrorState({ title, description, requestId, action, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--card-radius)] border border-border-hairline p-12 text-center',
        className
      )}
    >
      <AlertCircle aria-hidden className="h-8 w-8 text-status-critical" />
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-secondary">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
      {requestId ? (
        <p className="figure mt-2 font-mono text-xs text-ink-muted">Reference: {requestId}</p>
      ) : null}
    </div>
  );
}
