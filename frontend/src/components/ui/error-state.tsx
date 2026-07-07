import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title: string;
  description?: string;
  /** api_design.md's error envelope `request_id` — shown behind "Technical details" for support reference, never a stack trace. */
  requestId?: string;
  /** The backend's `ApiErrorCode`, or a route boundary's own digest-adjacent context — shown alongside requestId, same disclosure. */
  errorCode?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * States what happened in plain language and offers one concrete next
 * action (frontend_design_system.md §10). Never shows raw system detail.
 * Request ID / error code are useful for support but shouldn't dominate the
 * experience — collapsed behind a "Technical details" disclosure by default
 * (the same native `<details>`/`<summary>` pattern `StatTile`'s source
 * disclosure already uses: zero additional JavaScript, keyboard- and
 * screen-reader-operable by construction), never hidden entirely.
 */
export function ErrorState({ title, description, requestId, errorCode, action, className }: ErrorStateProps) {
  const hasTechnicalDetails = Boolean(requestId || errorCode);

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
      {hasTechnicalDetails ? (
        <details className="mt-2 text-xs text-ink-muted">
          <summary className="cursor-pointer select-none">Technical details</summary>
          <div className="figure mt-1 flex flex-col gap-0.5 font-mono">
            {errorCode ? <p>Error code: {errorCode}</p> : null}
            {requestId ? <p>Reference: {requestId}</p> : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
