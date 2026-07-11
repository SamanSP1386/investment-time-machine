'use client';

import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
 * The Growth Chart — the flagship data asset of the Results page (M7 Phase
 * 3C-3; visually upgraded M7 Phase 3D Design Elevation, FD-018/ADR-044;
 * refined to a craft finish M7 Phase 3D-1, task D). Evidence for the
 * worked-example sentence above it — never its own headline: no card
 * chrome, quiet axes, one hue (`--color-chart-portfolio`) regardless of
 * whether the trajectory is a gain or a loss (EXPERIENCE_CONSTITUTION.md
 * §6/§7 — identical visual treatment regardless of a result's sign;
 * BRAND_CONSTITUTION.md §3 — chart-data hues carry meaning, never UI
 * chrome, and a hue is never reused to "moralize" a result). Deliberately
 * in the SAME validated `--color-chart-portfolio` hue throughout, not the
 * mockup's own warm accent color — see ADR-044.
 *
 * Motion: per Founder Decision 013/017, this chart gets no draw-on
 * choreography; the only entrance motion is the same single ~200ms settle
 * already used for the hero sentence (`useSettleIn`). The one addition this
 * pass (task D.17) is the tooltip's own 120ms fade, gated on
 * `prefers-reduced-motion` via Recharts' own `isAnimationActive` prop —
 * hover/focus feedback, not decoration, matching FD-018's explicit
 * carve-out for state-communicating motion.
 *
 * Every displayed figure (tooltip, split disclosure, the accessible
 * summary sentence, the baseline/endpoint labels) is formatted from the
 * ORIGINAL `DecimalString` via `src/lib/format` — never from the JS number
 * `toChartPlotNumber` produces for Recharts' own plotting geometry (see
 * that module's doc comment and ADR-043/ADR-044). The Y-axis's sparse tick
 * labels are the one narrow, disclosed exception to that rule (see
 * `formatAxisTick` below) — Recharts' own scale algorithm computes round
 * reference values with no corresponding real data point/DecimalString to
 * format instead.
 */

/** Task D.14 — decimation tightened to ~150-200 drawn points so the line
 * reads as a clean editorial curve rather than a dense zig-zag on a
 * multi-year daily series; every raw point remains in The Proof's
 * accessible table regardless (that table reads `sim.growth_series`
 * directly, never this decimated array). No prior decimation algorithm
 * existed in this codebase to "adjust the threshold" of — this pass
 * introduces it fresh, at this target. */
const MAX_DRAWN_POINTS = 175;

/** Task D.15 — an endpoint label this long risks clipping against the
 * chart's right edge (the endpoint, by definition, is always the
 * rightmost plotted point) — e.g. "$1,234,567.89" (13 chars). Flip to a
 * left-anchored label instead of adding unbounded right margin for every
 * chart regardless of its actual values. */
const ENDPOINT_LABEL_FLIP_THRESHOLD = 10;

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

/** Evenly-spaced index sampling — always keeps the first and last point (so
 * the drawn line's own endpoints exactly match the accessible table's and
 * the worked-example sentence's), plus any point landing on a disclosed
 * split date (so a split marker is never silently dropped by the stride).
 * Selects WHICH already-computed points to draw; derives no new value. */
function decimatePoints(points: PlotPoint[], keepDates: Set<string>): PlotPoint[] {
  // eslint-disable-next-line no-restricted-syntax -- array-length comparison, not a DecimalString comparison (ADR-033).
  if (points.length <= MAX_DRAWN_POINTS) return points;

  const step = Math.ceil(points.length / MAX_DRAWN_POINTS);
  const kept = new Map<string, PlotPoint>();
  // eslint-disable-next-line no-restricted-syntax -- array-index loop bound, not a DecimalString comparison (ADR-033).
  for (let i = 0; i < points.length; i += step) {
    kept.set(points[i].point_date, points[i]);
  }
  const last = points[points.length - 1];
  kept.set(last.point_date, last);
  for (const point of points) {
    if (keepDates.has(point.point_date)) {
      kept.set(point.point_date, point);
    }
  }

  return Array.from(kept.values()).sort((a, b) => {
    // eslint-disable-next-line no-restricted-syntax -- fixed-width ISO date-string comparison, not a DecimalString comparison (ADR-033).
    if (a.point_date < b.point_date) return -1;
    // eslint-disable-next-line no-restricted-syntax -- fixed-width ISO date-string comparison, not a DecimalString comparison (ADR-033).
    if (a.point_date > b.point_date) return 1;
    return 0;
  });
}

/**
 * Formats a Y-axis TICK value for display — a round reference number
 * Recharts' own scale algorithm computed (never a specific data point, so
 * there is no corresponding original `DecimalString` to format instead).
 * Scoped to axis-label display only: never compared, never traced back to
 * a specific point, rounded to whole dollars (a coarse reference scale,
 * not a precise displayed figure) — the same disclosed-exception shape
 * `chart-plot-value.ts` already established for the opposite direction.
 */
function formatAxisTick(value: number): string {
  const rounded = Math.round(value);
  // eslint-disable-next-line no-restricted-syntax -- sign check on a Recharts-computed axis-scale number, not a DecimalString comparison (ADR-033).
  const sign = rounded < 0 ? '−' : '';
  const digits = Math.abs(rounded).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${grouped}`;
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

/**
 * Task D.17 — redesigned to the editorial language: a dark elevated
 * surface (already automatic — `bg-surface`/`border-border-hairline`
 * resolve through `.itm-elevated`'s token remap), mono figures, a kicker
 * date label. Reads the ORIGINAL `DecimalString` off the hovered point's
 * payload — never Recharts' own internal plotted number — so the tooltip
 * is exactly as Decimal-safe as every other figure on this page.
 */
function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-[var(--radius-sm)] border border-border-hairline bg-surface px-3.5 py-2.5 shadow-[var(--shadow-raised)]">
      <p className="kicker">{formatDate(point.point_date)}</p>
      <p className="figure mt-1 text-sm font-semibold text-ink-primary">{formatCurrency(point.rawValue)}</p>
    </div>
  );
}

function ChartBody({ sim, settled }: { sim: SimulationResponse; settled: boolean }) {
  const reducedMotion = useReducedMotion();
  const allPoints = toPlotPoints(sim.growth_series);
  const splitDates = new Set(sim.disclosed_splits.map((split) => split.split_date));
  const points = decimatePoints(allPoints, splitDates);
  const pointDates = new Set(points.map((p) => p.point_date));
  // Only disclose a marker for a split whose date lands on an actual
  // plotted price point — Recharts' category-axis ReferenceLine requires an
  // exact category match to render at all; a split whose date doesn't
  // resolve to a price row in this range is still disclosed in plain
  // language below regardless (never silently dropped), just without a
  // visual marker. `decimatePoints` already guarantees a split date
  // survives decimation whenever it exists in the full series.
  const markedSplits = sim.disclosed_splits.filter((split) => pointDates.has(split.split_date));

  const first = allPoints[0];
  const last = allPoints[allPoints.length - 1];
  // eslint-disable-next-line no-restricted-syntax -- array-length comparison, not a DecimalString comparison (ADR-033).
  const wasDecimated = allPoints.length > points.length;
  const summary = `This chart traces the value of this investment from ${formatCurrency(first.rawValue)} on ${formatDate(first.point_date)} to ${formatCurrency(last.rawValue)} on ${formatDate(last.point_date)}, across ${allPoints.length} data points${wasDecimated ? ` (a smoothed line of ${points.length} is drawn for readability — every point is available in the table below)` : ''}.`;

  // Baseline reference — the invested amount, matching the mockup's dashed
  // "$X invested" line. The second (and, per ADR-044, last) call site for
  // toChartPlotNumber: this is chart geometry only (a Y position), never
  // displayed — the label text below reads investment_amount, the original
  // DecimalString, via formatCurrency.
  const investedPlotValue = toChartPlotNumber(sim.investment_amount);
  const investedLabel = `${formatCurrency(sim.investment_amount, { decimals: 0 })} invested`;
  const endpointLabel = formatCurrency(last.rawValue);
  // eslint-disable-next-line no-restricted-syntax -- string-length comparison, not a DecimalString comparison (ADR-033).
  const endpointLabelFlipped = endpointLabel.length > ENDPOINT_LABEL_FLIP_THRESHOLD;
  // The baseline sits near the top of the plotted domain for a loss (the
  // invested amount is the series' own maximum) and near the bottom for a
  // gain — found live (task D verification): anchoring its label on the
  // side with no headroom made it collide with the price line's own
  // starting point, regardless of Y-axis padding. Flip the label to
  // whichever side actually has room, mirroring endpointLabelFlipped's own
  // pattern. Both values are already-disclosed toChartPlotNumber outputs
  // (chart geometry only), so a plain numeric comparison here is the same
  // category of safe, narrow exception the rest of this file already uses.
  // eslint-disable-next-line no-restricted-syntax -- chart-geometry-only comparison of two toChartPlotNumber outputs, not a DecimalString comparison (ADR-033).
  const isNetGain = last.plotValue >= investedPlotValue;

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
          <ComposedChart data={points} margin={{ top: 8, right: endpointLabelFlipped ? 16 : 84, bottom: 8, left: 4 }}>
            <defs>
              <linearGradient id="growthAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--color-chart-portfolio)' }} stopOpacity={0.28} />
                <stop offset="100%" style={{ stopColor: 'var(--color-chart-portfolio)' }} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="point_date"
              tickFormatter={(date: string) => formatDate(date)}
              tick={{ fontSize: 11, fill: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--color-border-gridline)' }}
              tickLine={false}
              minTickGap={48}
            />
            {/* Task D.16 — a sparse (3-4 tick), hairline-only mono Y-axis. No
                axis line drawn (axisLine=false) — the tick text alone is
                the "hairline," matching this chart's quiet, no-chrome
                language; formatAxisTick's own doc comment discloses why a
                plain number formatter is safe here.

                An explicit, padded domain (found necessary live — task D's
                verification pass): Recharts' Area component defaults to
                including a zero baseline, which on a chart whose real
                range never approaches zero (e.g. $1,000-$1,900) wastes
                most of the plotted height. The 8% padding on both ends
                also gives the invested-amount reference line's label room
                to render without clipping against the plot's own edge — a
                real, observed collision on a loss trajectory, where the
                invested amount IS the series' own maximum, sitting
                exactly at the domain boundary with zero headroom
                otherwise. */}
            <YAxis
              dataKey="plotValue"
              axisLine={false}
              tickLine={false}
              tickCount={4}
              width={68}
              tick={{ fontSize: 11, fill: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
              tickFormatter={formatAxisTick}
              domain={[
                (dataMin: number) => Math.floor(Math.min(dataMin, investedPlotValue) * 0.92),
                (dataMax: number) => Math.ceil(Math.max(dataMax, investedPlotValue) * 1.08),
              ]}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'var(--color-ink-muted)', strokeDasharray: '2 3' }}
              isAnimationActive={!reducedMotion}
              animationDuration={120}
              animationEasing="ease-out"
            />
            <ReferenceLine
              y={investedPlotValue}
              stroke="var(--color-ink-muted)"
              strokeDasharray="3 5"
              ifOverflow="extendDomain"
              label={{
                value: investedLabel,
                position: isNetGain ? 'insideTopLeft' : 'insideBottomLeft',
                fill: 'var(--color-ink-muted)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
            />
            {markedSplits.map((split) => (
              <ReferenceLine
                key={split.split_date}
                x={split.split_date}
                stroke="var(--color-ink-muted)"
                strokeDasharray="2 3"
                ifOverflow="extendDomain"
              />
            ))}
            <Area
              type="monotone"
              dataKey="plotValue"
              stroke="none"
              fill="url(#growthAreaFill)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="plotValue"
              stroke="var(--color-chart-portfolio)"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--color-chart-portfolio)', stroke: 'var(--color-background)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={last.point_date}
              y={last.plotValue}
              r={4}
              fill="var(--color-chart-portfolio)"
              stroke="none"
              label={{
                value: endpointLabel,
                position: endpointLabelFlipped ? 'left' : 'right',
                fill: 'var(--color-chart-portfolio)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            />
          </ComposedChart>
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
