import { cn } from '@/lib/utils';

export interface StatTileProps {
  label: string;
  value: string;
  /** Sign must already be in the string (e.g. "+9.2%") — color is never the only signal. */
  delta?: { value: string; direction: 'positive' | 'negative' };
  /** The field/formula this figure traces to — rendered as a tap-to-expand disclosure, never hidden. */
  source?: string;
  className?: string;
  /**
   * 'default' (text-3xl/text-4xl) suits one tile shown alone or full-width.
   * 'compact' (text-2xl/text-3xl) is for a multi-tile row (e.g. three hero
   * numbers side by side) where a long currency figure at the default size
   * would overflow a narrow column — found on the Results screen (M7 Phase
   * 3B) with a five-figure `final_value`. Defaults to 'default' so every
   * existing call site is unaffected.
   */
  size?: 'default' | 'compact';
}

/**
 * Every hero number exposes its source formula on expand — the single
 * highest-leverage signature detail in BRAND_CONSTITUTION.md §9/§10: a
 * literal, always-available expression of "every number traces to a
 * source." Uses a native <details> so it is keyboard- and
 * screen-reader-operable with zero additional JavaScript.
 */
export function StatTile({ label, value, delta, source, className, size = 'default' }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-[var(--card-radius)] border border-border-hairline bg-surface',
        size === 'compact' ? 'p-4' : 'p-6',
        className
      )}
    >
      <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</p>
      <p
        className={cn(
          'figure font-semibold text-ink-primary break-words',
          size === 'compact' ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'
        )}
      >
        {value}
      </p>
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
