'use client';

import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { toChartPlotNumber } from './chart-plot-value';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettleIn } from '@/hooks/use-settle-in';
import { cn } from '@/lib/utils';
import {
  asDecimalString,
  compareDecimalStrings,
  formatCurrency,
  formatDate,
  type DecimalString,
} from '@/lib/format';
import type { DisclosedSplit, GrowthSeriesPoint, SimulationResponse } from '@/types/api';

/**
 * The Growth Chart (M7 Phase 3C-3, Founder Decision 014's `growth_series`
 * finally has data to render). Evidence for the worked-example sentence
 * above it — never its own headline: no card chrome, no border, quiet axes,
 * one hue (`--color-chart-portfolio`) regardless of whether the trajectory
 * is a gain or a loss (EXPERIENCE_CONSTITUTION.md §6/§7 — identical visual
 * treatment regardless of a result's sign; BRAND_CONSTITUTION.md §3 —
 * chart-data hues carry meaning, never UI chrome, and a hue is never
 * reused to "moralize" a result).
 *
 * Motion: per Founder Decision 013/017 (superseding the older, pre-FD-017
 * "chart line draws in once" language in frontend_design_system.md §8–9,
 * written before that ruling existed), this chart gets no draw-on
 * choreography. Recharts' own line-draw animation is disabled outright
 * (`isAnimationActive={false}`); the only motion is the same single ~200ms
 * settle already used for the hero sentence (`useSettleIn`), fully static
 * under `prefers-reduced-motion` via the same mechanism.
 *
 * Every displayed figure (tooltip, split disclosure, the accessible
 * summary sentence) is formatted from the ORIGINAL `DecimalString` via
 * `src/lib/format` — never from the JS number `toChartPlotNumber` produces
 * for Recharts' own plotting geometry (see that module's doc comment and
 * ADR-043 for why that one narrow conversion is safe and disclosed).
 */

interface PlotPoint {
  point_date: string;
  plotValue: number;
  rawValue: DecimalString;
}

function toPlotPoints(series: GrowthSeriesPoint[]): PlotPoint[] {
  return series.map((point) => ({
    point_date: point.point_date,
    plotValue: toChartPlotNumber(point.value),
    rawValue: point.value,
  }));
}

/** `true` for a forward split (e.g. 4-for-1, ratio > 1); `false` otherwise (a reverse split, ratio < 1 — rare, but not fabricated as a "1-for-N" figure this codebase cannot safely derive without banned arithmetic; see the fallback phrasing below). */
function isForwardSplit(split: DisclosedSplit): boolean {
  return compareDecimalStrings(split.split_ratio, asDecimalString('1')) === 1;
}

function splitDisclosureText(split: DisclosedSplit): string {
  const date = formatDate(split.split_date);
  if (isForwardSplit(split)) {
    // roundDecimalString(..., 0) is a sanctioned *display*-precision rounding
    // (src/lib/format), not a derivation — "4.000000" -> "4", never a new figure.
    const wholeRatio = formatCurrency(split.split_ratio, { currencySymbol: '', decimals: 0 });
    return `A ${wholeRatio}-for-1 stock split occurred on ${date}. Prices shown are adjusted; your return is unaffected.`;
  }
  return `A reverse stock split (ratio ${split.split_ratio}) occurred on ${date}. Prices shown are adjusted; your return is unaffected.`;
}

/** Section 5's honest fallback for the one case Founder Decision 014 leaves open: a completed simulation whose pre-existing row the backfill script could not recompute (a logged, reported exception — docs/KNOWN_ISSUES.md KI-021). Never a crash, never a silently empty box. */
function EmptySeriesFallback({ simId }: { simId: string }) {
  return (
    <p className="max-w-prose text-sm text-ink-secondary">
      A day-by-day growth chart isn&rsquo;t available for this specific simulation — an unusual gap for a completed
      result. The Final Value and Total Return above are already exact and fully calculated; only this particular
      view of the path getting there could not be reconstructed.{' '}
      <span className="figure font-mono text-xs text-ink-muted">Simulation ID: {simId}</span>
    </p>
  );
}

/** A single data point cannot draw a line — rendering one anyway (even a flat one) would imply a trajectory that was never observed. Render the one honest fact instead. */
function SinglePointFallback({ point, settled }: { point: GrowthSeriesPoint; settled: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 transition duration-[var(--duration-transition)] ease-in',
        settled ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-chart-portfolio" aria-hidden />
        <p className="figure text-sm text-ink-primary">
          {formatDate(point.point_date)}: {formatCurrency(point.value)}
        </p>
      </div>
      <p className="max-w-prose text-sm text-ink-secondary">
        This simulation&rsquo;s start and end date resolve to a single price point, so there is nothing to trace a
        path between — this single value is shown as-is, not interpolated into a line that was never observed.
      </p>
    </div>
  );
}

interface TooltipPayloadEntry {
  payload: PlotPoint;
}

/** Reads the ORIGINAL DecimalString off the hovered point's payload — never Recharts' own internal plotted number — so the tooltip is exactly as Decimal-safe as every other figure on this page. */
function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-[var(--radius-sm)] border border-border-hairline bg-surface px-3 py-2 shadow-[var(--shadow-raised)]">
      <p className="text-xs text-ink-muted">{formatDate(point.point_date)}</p>
      <p className="figure text-sm font-medium text-ink-primary">{formatCurrency(point.rawValue)}</p>
    </div>
  );
}

function ChartBody({ sim, settled }: { sim: SimulationResponse; settled: boolean }) {
  const points = toPlotPoints(sim.growth_series);
  const pointDates = new Set(points.map((p) => p.point_date));
  // Only disclose a marker for a split whose date lands on an actual
  // plotted price point — Recharts' category-axis ReferenceLine requires an
  // exact category match to render at all; a split whose date doesn't
  // resolve to a price row in this range is still disclosed in plain
  // language below regardless (never silently dropped), just without a
  // visual marker.
  const markedSplits = sim.disclosed_splits.filter((split) => pointDates.has(split.split_date));

  const first = points[0];
  const last = points[points.length - 1];
  const summary = `This chart traces the value of this investment from ${formatCurrency(first.rawValue)} on ${formatDate(first.point_date)} to ${formatCurrency(last.rawValue)} on ${formatDate(last.point_date)}, across ${points.length} data points.`;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 transition duration-[var(--duration-transition)] ease-in',
        settled ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      )}
    >
      {/* Decorative relative to the text alternative immediately below — a
          screen reader gets the same information as prose, not an attempt
          to narrate SVG geometry. */}
      <div aria-hidden className="h-48 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <XAxis
              dataKey="point_date"
              tickFormatter={(date: string) => formatDate(date)}
              tick={{ fontSize: 12, fill: 'var(--color-ink-muted)' }}
              axisLine={{ stroke: 'var(--color-border-gridline)' }}
              tickLine={false}
              minTickGap={48}
            />
            <Tooltip content={<ChartTooltip />} />
            {markedSplits.map((split) => (
              <ReferenceLine
                key={split.split_date}
                x={split.split_date}
                stroke="var(--color-ink-muted)"
                strokeDasharray="2 3"
                ifOverflow="extendDomain"
              />
            ))}
            <Line
              type="monotone"
              dataKey="plotValue"
              stroke="var(--color-chart-portfolio)"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="max-w-prose text-sm text-ink-secondary">{summary}</p>

      {/* eslint-disable-next-line no-restricted-syntax -- array-length comparison, not a DecimalString comparison (ADR-033). */}
      {sim.disclosed_splits.length > 0 ? (
        <div className="flex flex-col gap-1">
          {sim.disclosed_splits.map((split) => (
            <p key={split.split_date} className="max-w-prose text-xs text-ink-muted">
              {splitDisclosureText(split)}
            </p>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-ink-muted">
        The exact value and date for every point above are available in a table in{' '}
        <span className="font-medium text-ink-secondary">The Proof</span>, below — the same data the chart draws
        from, reachable without a mouse.
      </p>
    </div>
  );
}

export function GrowthChart({ sim }: { sim: SimulationResponse }) {
  const reducedMotion = useReducedMotion();
  const settled = useSettleIn(!reducedMotion);

  if (sim.growth_series.length === 0) {
    return <EmptySeriesFallback simId={sim.id} />;
  }
  if (sim.growth_series.length === 1) {
    return <SinglePointFallback point={sim.growth_series[0]} settled={settled} />;
  }
  return <ChartBody sim={sim} settled={settled} />;
}
