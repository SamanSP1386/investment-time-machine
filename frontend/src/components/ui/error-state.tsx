import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Disclosure } from './disclosure';
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
 * experience — collapsed behind a "Technical details" disclosure by
 * default (the shared `Disclosure` primitive, M7 Phase 3D-1 task B.8),
 * never hidden entirely.
 *
 * M7 Phase 3D-1 (Craft & Coherence, task E.20): the icon is a neutral,
 * muted mark, not `--color-status-critical` red — "no red alarm panels."
 * A calm, explanatory tone applies even to a genuine failure; the words
 * carry the meaning, not a colored siren.
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
      <AlertCircle aria-hidden className="h-8 w-8 text-ink-muted" />
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-secondary">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
      {hasTechnicalDetails ? (
        <Disclosure
          className="mt-2 text-xs text-ink-muted"
          summaryClassName="justify-center gap-1.5"
          chevronClassName="h-3 w-3"
          summary="Technical details"
        >
          <div className="figure mt-1 flex flex-col gap-0.5">
            {errorCode ? <p>Error code: {errorCode}</p> : null}
            {requestId ? <p>Reference: {requestId}</p> : null}
          </div>
        </Disclosure>
      ) : null}
    </div>
  );
}
