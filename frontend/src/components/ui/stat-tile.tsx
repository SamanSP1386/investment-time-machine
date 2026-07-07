import { cn } from '@/lib/utils';

export interface StatTileProps {
  label: string;
  value: string;
  /** Sign must already be in the string (e.g. "+9.2%") — color is never the only signal. */
  delta?: { value: string; direction: 'positive' | 'negative' };
  /** The field/formula this figure traces to — rendered as a tap-to-expand disclosure, never hidden. */
  source?: string;
  className?: string;
}

/**
 * Every hero number exposes its source formula on expand — the single
 * highest-leverage signature detail in BRAND_CONSTITUTION.md §9/§10: a
 * literal, always-available expression of "every number traces to a
 * source." Uses a native <details> so it is keyboard- and
 * screen-reader-operable with zero additional JavaScript.
 */
export function StatTile({ label, value, delta, source, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-[var(--card-radius)] border border-border-hairline bg-surface p-6',
        className
      )}
    >
      <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</p>
      <p className="figure text-3xl font-semibold text-ink-primary sm:text-4xl">{value}</p>
      {delta ? (
        <p
          className={cn(
            'figure text-sm font-medium',
            delta.direction === 'positive' ? 'text-status-good' : 'text-status-critical'
          )}
        >
          {delta.value}
        </p>
      ) : null}
      {source ? (
        <details className="mt-1 text-xs text-ink-muted">
          <summary className="cursor-pointer select-none">Source</summary>
          <p className="figure mt-1 font-mono">{source}</p>
        </details>
      ) : null}
    </div>
  );
}
