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
 * refined to a craft finish M7 Phase 3D-1, task D; analytical upgrades M7
 * Phase 3D-3, item 6). Evidence for the worked-example sentence above it —
 * never its own headline: no card chrome, quiet axes, one hue
 * (`--color-chart-portfolio`) for the PRICE LINE regardless of whether the
 * trajectory is a gain or a loss (EXPERIENCE_CONSTITUTION.md §6/§7 —
 * identical visual treatment regardless of a result's sign;
 * BRAND_CONSTITUTION.md §3 — chart-data hues carry meaning, never UI
 * chrome, and a hue is never reused to "moralize" a result). Deliberately
 * in the SAME validated `--color-chart-portfolio` hue throughout, not the
 * mockup's own warm accent color — see ADR-044.
 *
 * M7 Phase 3D-3 item 6 adds three analytical layers, all applied by the
 * SAME rule regardless of whether the simulation's own overall result is a
 * gain or a loss (the rule is position-relative — above/below the invested
 * baseline — never sign-of-the-final-result-relative, so FD-013/017's
 * "identical treatment" guarantee is unbroken): (a) the area fill splits at
 * the invested-amount baseline, accent-toned above it and a muted
 * `--color-chart-negative` tone below (the already-validated,
 * CVD-safe "diverging pair" hue this codebase's own categorical palette
 * reserved for exactly this — `frontend_design_system.md` §3 — never a new,
 * unvalidated color); (b) a thin vertical crosshair (`ChartCrosshair`)
 * tracks the cursor alongside the existing tooltip; (c) quiet, muted
 * high/low markers label the series' own genuine extremes. Item 6d
 * (reinvestment-date tick marks) is explicitly DEFERRED, not implemented:
 * `SimulationResponse` exposes only `include_dividends: boolean`, no
 * per-event reinvestment dates — there is nothing real to mark without
 * fabricating dates the API does not provide, which item 6's own
 * instruction explicitly rules out ("if the API doesn't expose dividend
 * dates, mark DEFERRED... rather than faking it").
 *
 * Motion: per Founder Decision 013/017, this chart gets no draw-on
 * choreography; the only entrance motion is the same single ~200ms settle
 * already used for the hero sentence (`useSettleIn`). Tooltip: a 120ms fade
 * (task D.17), gated on `prefers-reduced-motion` via Recharts' own
 * `isAnimationActive` prop. Crosshair (item 6b): a matching 120ms fade-IN
 * (`.chart-crosshair`, `globals.css`) — fade-out is an instant unmount, a
 * disclosed asymmetry (see that class's own comment) — omitted entirely
 * under reduced motion (`cursor={false}`) rather than left unanimated, so
 * the tooltip alone is what a reduced-motion reader sees on hover. Both are
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

export interface PlotPoint {
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

/**
 * A point augmented with the two clamped series the split-baseline fill
 * (item 6a) plots: `aboveValue` never dips below the invested baseline
 * (renders as a zero-height, invisible fill wherever the real line is
 * below it), `belowValue` never rises above it. Two `<Area>`s sharing this
 * same data, both anchored at the baseline via Recharts' own `baseValue`
 * prop, produce a fill that is accent-toned above the line the user
 * invested at and muted below it — without ever changing the price
 * LINE's own single validated hue (ADR-044's "never substituted"
 * constraint governs the line, not this new area-fill encoding).
 */
interface BaselineSplitPoint extends PlotPoint {
  aboveValue: number;
  belowValue: number;
}

function withBaselineSplit(points: PlotPoint[], investedPlotValue: number): BaselineSplitPoint[] {
  return points.map((point) => ({
    ...point,
    aboveValue: Math.max(point.plotValue, investedPlotValue),
    belowValue: Math.min(point.plotValue, investedPlotValue),
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

/**
 * A compact "Mon YYYY" label for the high/low markers (item 6c) — the
 * marker's own value is already the real `formatCurrency`-formatted
 * `DecimalString` (a true data point, no exception needed); only the
 * month/year portion is a narrow, chart-local display exception (same
 * disclosed-exception shape as `formatAxisTick` above), since
 * `src/lib/format`'s `formatDate` always spells out the day too and would
 * make an already-small marker label crowd the plot.
 */
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
function formatMonthYear(isoDate: string): string {
  return MONTH_YEAR_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
}

function daysBetween(isoDateA: string, isoDateB: string): number {
  const msPerDay = 86_400_000;
  return Math.abs(new Date(`${isoDateA}T00:00:00Z`).getTime() - new Date(`${isoDateB}T00:00:00Z`).getTime()) / msPerDay;
}

/**
 * M7 Phase 3D-4, item 4 — the high/low markers' own existing collision
 * guard (`isFarEnoughFromEndpointAndStart`, below) only checks each marker
 * against the endpoint and the series' start; it never checked the two
 * markers against EACH OTHER. The high marker's label sits ABOVE its point
 * (`position: 'top'`) and the low marker's sits BELOW its point
 * (`position: 'bottom'`) — since high is, by construction, plotted higher
 * on the Y axis than low, their labels normally point AWAY from each other
 * and date (X) proximity alone doesn't cause a collision (a first attempt
 * at this fix used date proximity alone and broke a live case: a high/low
 * pair 10 days apart but $1,000 apart in value on a $460–$1,620 domain never
 * visually collides — the labels sit in entirely different vertical bands).
 * The real collision case is the opposite: a low-volatility run where the
 * high and low values themselves are close enough that both points land in
 * nearly the same Y band, so their oppositely-pointing labels still
 * overlap. Compared against a fraction of the chart's own PLOTTED domain
 * span (`yAxisDomainMax - yAxisDomainMin`, the actual pixel-mapped range,
 * including the invested-baseline padding) — never a fraction of
 * `high.plotValue - low.plotValue` itself, which (since high and low ARE
 * that gap's own endpoints) can never usefully fire.
 */
const MUTUAL_MARKER_VALUE_GUARD_FRACTION = 0.15;

export function markersTooCloseByValue(a: PlotPoint, b: PlotPoint, domainSpan: number): boolean {
  // eslint-disable-next-line no-restricted-syntax -- chart-geometry-only (number) comparison of toChartPlotNumber outputs, not a DecimalString comparison (ADR-033).
  return Math.abs(a.plotValue - b.plotValue) < domainSpan * MUTUAL_MARKER_VALUE_GUARD_FRACTION;
}

/**
 * M7 Phase 3D-4, item 4 — the Y-axis's `width` was a single fixed 68px,
 * sized for a typical 4-6-digit dollar figure. A $1,000,000+ portfolio
 * value formats to 7+ digits (`formatAxisTick`: "$1,234,567"), which at the
 * axis's own 11px mono tick font clips against the plot area at that fixed
 * width. Measures the longest tick label THIS chart will actually draw
 * (its own padded domain's max/min, run through the same `formatAxisTick`
 * the axis itself uses) rather than guessing a larger constant that would
 * over-reserve space for every smaller chart.
 */
const AXIS_TICK_CHAR_WIDTH_PX = 6.6; // ~IBM Plex Mono at 11px
const AXIS_TICK_WIDTH_PADDING_PX = 16;
const AXIS_TICK_MIN_WIDTH_PX = 56;
const AXIS_TICK_MAX_WIDTH_PX = 108;

export function computeYAxisWidth(paddedDomainMin: number, paddedDomainMax: number): number {
  const longest = Math.max(formatAxisTick(paddedDomainMin).length, formatAxisTick(paddedDomainMax).length);
  const measured = longest * AXIS_TICK_CHAR_WIDTH_PX + AXIS_TICK_WIDTH_PADDING_PX;
  return Math.min(AXIS_TICK_MAX_WIDTH_PX, Math.max(AXIS_TICK_MIN_WIDTH_PX, Math.round(measured)));
}

/**
 * The series' own high/low points (item 6c) — found over the FULL,
 * undecimated series (`allPoints`, not the drawn/decimated `points`), so
 * the marker always lands on the trajectory's genuine extreme, never one
 * decimation happened to keep or drop. Ties resolve to the earliest date
 * (a plain `>`/`<` scan, first match wins), an arbitrary but deterministic
 * choice — a genuine exact tie is already an edge case this fixture-only
 * synthetic data can produce, real market data effectively never will.
 */
function findExtremePoints(allPoints: PlotPoint[]): { high: PlotPoint; low: PlotPoint } {
  let high = allPoints[0];
  let low = allPoints[0];
  for (const point of allPoints) {
    // eslint-disable-next-line no-restricted-syntax -- chart-geometry-only comparison of toChartPlotNumber outputs, not a DecimalString comparison (ADR-033).
    if (point.plotValue > high.plotValue) high = point;
    // eslint-disable-next-line no-restricted-syntax -- chart-geometry-only comparison of toChartPlotNumber outputs, not a DecimalString comparison (ADR-033).
    if (point.plotValue < low.plotValue) low = point;
  }
  return { high, low };
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

/**
 * Item 6b — a thin vertical hairline tracking the cursor, alongside the
 * existing tooltip (unchanged). A custom Recharts `cursor` component
 * (rather than the plain `{ stroke, strokeDasharray }` style object this
 * file used previously) so it can carry its own `chart-crosshair` class —
 * the fade transition itself lives in `globals.css`, gated the same way
 * every other motion in this codebase is. Recharts supplies `points`
 * (the cursor's own start/end geometry) and `height` to a custom cursor
 * element; only `points[0].x` (the hovered X position) and `height` are
 * needed to draw one straight vertical line spanning the plot.
 */
function ChartCrosshair({ points, height }: { points?: { x: number; y: number }[]; height?: number }) {
  const x = points?.[0]?.x;
  if (x === undefined || height === undefined) return null;
  return (
    <line className="chart-crosshair" x1={x} x2={x} y1={0} y2={height} stroke="var(--color-ink-muted)" strokeWidth={1} />
  );
}

function ChartBody({ sim, settled }: { sim: SimulationResponse; settled: boolean }) {
  const reducedMotion = useReducedMotion();
  const allPoints = toPlotPoints(sim.growth_series);
  // Item 6c — found over the full series, BEFORE decimation, and forced
  // into `keepDates` below so decimation can never drop the genuine
  // high/low the way it's free to drop any other interior point.
  const { high, low } = findExtremePoints(allPoints);
  const splitDates = new Set(sim.disclosed_splits.map((split) => split.split_date));
  const keepDates = new Set([...splitDates, high.point_date, low.point_date]);
  const points = decimatePoints(allPoints, keepDates);
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

  // Item 6a — the split-baseline area fill's own data (built from the
  // already-decimated `points`, matching what the Line/Area already draw).
  const splitPoints = withBaselineSplit(points, investedPlotValue);

  // Item 6c marker visibility — skipped whenever the high/low sits too
  // close to the endpoint (or the plot's left edge) on EITHER axis: date
  // (a fraction of the series' own total day-span) or value (a fraction of
  // the series' own high-low range). Date alone isn't enough — found live,
  // a near-monotonic loss trajectory whose true low landed several weeks
  // before the endpoint but at an almost-identical Y position still
  // crowded the endpoint label badly, since both labels render in the same
  // bottom-right corner regardless of the weeks between their X positions.
  // Collision avoidance by omission, the same approach `markedSplits`
  // already uses above.
  const totalSpanDays = Math.max(1, daysBetween(first.point_date, last.point_date));
  const edgeGuardDays = Math.max(14, totalSpanDays * 0.04);
  const valueSpan = Math.max(1e-9, high.plotValue - low.plotValue);
  const valueGuard = valueSpan * 0.06;
  function isFarEnoughFromEndpointAndStart(point: PlotPoint): boolean {
    // eslint-disable-next-line no-restricted-syntax -- plain day-count/chart-geometry (number) comparisons, not a DecimalString comparison (ADR-033).
    const farFromEndpointByDate = daysBetween(point.point_date, last.point_date) > edgeGuardDays;
    // eslint-disable-next-line no-restricted-syntax -- plain day-count (number) comparison, not a DecimalString comparison (ADR-033).
    const farFromStartByDate = daysBetween(point.point_date, first.point_date) > edgeGuardDays;
    // eslint-disable-next-line no-restricted-syntax -- chart-geometry-only (number) comparison of toChartPlotNumber outputs, not a DecimalString comparison (ADR-033).
    const farFromEndpointByValue = Math.abs(point.plotValue - last.plotValue) > valueGuard;
    return farFromEndpointByDate && farFromStartByDate && farFromEndpointByValue;
  }
  // The padded plot domain — computed here (rather than only inline on
  // <YAxis> below) so both the Y-axis width measurement AND the high/low
  // mutual-collision check (item 4) share the exact one domain calculation,
  // never two that could silently drift apart.
  const yAxisDomainMin = Math.floor(Math.min(low.plotValue, investedPlotValue) * 0.92);
  const yAxisDomainMax = Math.ceil(Math.max(high.plotValue, investedPlotValue) * 1.08);
  const yAxisWidth = computeYAxisWidth(yAxisDomainMin, yAxisDomainMax);

  // Item 4 — mutual collision: if the high and low markers would land close
  // enough to each other in VALUE to visually collide, only the
  // earlier-dated one is kept (a deterministic, disclosed tie-break,
  // matching findExtremePoints' own "earliest date wins" convention above)
  // — never both, and never a silent stacked-label overlap.
  const highLowCollide = markersTooCloseByValue(high, low, yAxisDomainMax - yAxisDomainMin);
  // eslint-disable-next-line no-restricted-syntax -- fixed-width ISO date-string comparison, not a DecimalString comparison (ADR-033).
  const earlierOfHighLow = high.point_date <= low.point_date ? 'high' : 'low';
  const showHighMarker =
    isFarEnoughFromEndpointAndStart(high) && (!highLowCollide || earlierOfHighLow === 'high');
  const showLowMarker =
    isFarEnoughFromEndpointAndStart(low) && (!highLowCollide || earlierOfHighLow === 'low');
  return (
    <div
      className={cn(
        'flex flex-col gap-4 transition duration-[var(--duration-transition)] ease-in',
        settled ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      )}
    >
      {/* Decorative relative to the text alternative immediately below — a
          screen reader gets the same information as prose, not an attempt
          to narrate SVG geometry. M7 Phase 3D-3 (item 2) — deliberately
          allowed to bleed past the surrounding prose measure (a modest
          negative margin into the page's own horizontal padding gutter,
          not past the outer ProductShell column) so the flagship chart
          reads as wider/more present than the text around it, per the
          founder's explicit "chart may bleed slightly wider than text." */}
      <div aria-hidden className="-mx-6 h-48 w-[calc(100%+3rem)] sm:-mx-10 sm:h-64 sm:w-[calc(100%+5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={splitPoints}
            margin={{ top: 8, right: endpointLabelFlipped ? 16 : 84, bottom: 8, left: 4 }}
          >
            <defs>
              {/* Item 6a — two fills, split at the invested-amount baseline:
                  accent-toned above it, a muted cool tone below. The
                  already-validated `--color-chart-negative` diverging-pair
                  hue (frontend_design_system.md §3's "reserved for the
                  diverging pair — loss/negative territory") at the SAME low
                  opacity the original single fill used — "muted" is the low
                  opacity, not a hue outside this chart's closed, CVD-
                  validated palette (ADR-044). The price LINE itself is
                  unchanged — still one hue, always, regardless of sign. */}
              <linearGradient id="growthAreaFillAbove" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--color-chart-portfolio)' }} stopOpacity={0.28} />
                <stop offset="100%" style={{ stopColor: 'var(--color-chart-portfolio)' }} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="growthAreaFillBelow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--color-chart-negative)' }} stopOpacity={0} />
                <stop offset="100%" style={{ stopColor: 'var(--color-chart-negative)' }} stopOpacity={0.22} />
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
              width={yAxisWidth}
              tick={{ fontSize: 11, fill: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
              tickFormatter={formatAxisTick}
              domain={[
                (dataMin: number) => Math.floor(Math.min(dataMin, investedPlotValue) * 0.92),
                (dataMax: number) => Math.ceil(Math.max(dataMax, investedPlotValue) * 1.08),
              ]}
            />
            <Tooltip
              content={<ChartTooltip />}
              // Item 6b — a thin vertical hairline (ChartCrosshair) rather
              // than the previous dashed cursor style. Reduced motion drops
              // the crosshair entirely (`false`) rather than rendering it
              // unanimated — the tooltip box alone (already
              // reduced-motion-safe below) is the static fallback.
              cursor={reducedMotion ? false : <ChartCrosshair />}
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
            {/* Item 6a — two Areas sharing `splitPoints`, both anchored at
                the invested baseline via `baseValue`: `aboveValue` never
                dips below it (an invisible, zero-height fill wherever the
                real line is below the baseline), `belowValue` never rises
                above it. Together they read as one fill that changes tone
                exactly where the price line crosses what the user
                invested. */}
            <Area
              type="monotone"
              dataKey="aboveValue"
              baseValue={investedPlotValue}
              stroke="none"
              fill="url(#growthAreaFillAbove)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="belowValue"
              baseValue={investedPlotValue}
              stroke="none"
              fill="url(#growthAreaFillBelow)"
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
            {/* Item 6c — quiet high/low markers: a small hollow dot (muted,
                never the portfolio-blue hue the endpoint/line use, so
                neither reads as "the result") plus a compact "value ·
                Mon YYYY" label. `position` (top for the high, bottom for
                the low) plus the endpoint-coincidence skip above are this
                marker's own collision avoidance. */}
            {showHighMarker ? (
              <ReferenceDot
                x={high.point_date}
                y={high.plotValue}
                r={3}
                fill="var(--color-background)"
                stroke="var(--color-ink-muted)"
                strokeWidth={1.5}
                label={{
                  value: `${formatCurrency(high.rawValue)} · ${formatMonthYear(high.point_date)}`,
                  position: 'top',
                  fill: 'var(--color-ink-muted)',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                }}
              />
            ) : null}
            {showLowMarker ? (
              <ReferenceDot
                x={low.point_date}
                y={low.plotValue}
                r={3}
                fill="var(--color-background)"
                stroke="var(--color-ink-muted)"
                strokeWidth={1.5}
                label={{
                  value: `${formatCurrency(low.rawValue)} · ${formatMonthYear(low.point_date)}`,
                  position: 'bottom',
                  fill: 'var(--color-ink-muted)',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                }}
              />
            ) : null}
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
