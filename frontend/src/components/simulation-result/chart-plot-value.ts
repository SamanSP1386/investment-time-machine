import type { DecimalString } from '@/lib/format';

/**
 * Converts a `DecimalString` to a JS number for exactly one narrow purpose:
 * feeding Recharts' (SVG) numeric plotting geometry — pixel/axis positioning
 * for the growth chart. This is a deliberate, disclosed, narrowly-scoped
 * exception to this codebase's "never convert a DecimalString to a JS
 * number" rule (src/lib/format/README.md, ADR-029/ADR-033) — not a loophole
 * around it. See docs/ARCHITECTURE_DECISIONS.md ADR-043 for the full
 * reasoning; summarized here:
 *
 * - No SVG charting library can position a mark without a numeric
 *   coordinate — this is an unavoidable technical requirement of rendering
 *   a line chart at all, not a workaround of the precision rule.
 * - The RESULT of this conversion is used for chart geometry only. It must
 *   never be displayed as a figure, compared for a financial decision, or
 *   fed into any calculation. Every displayed axis tick, tooltip value, and
 *   the accessible data table (The Proof) all independently re-format the
 *   ORIGINAL `DecimalString` via `src/lib/format`, never this function's
 *   output.
 * - A chart's actual rendered resolution (a few hundred device-independent
 *   pixels) is many orders of magnitude coarser than a JS number's
 *   ~15–17 significant-digit precision, so this conversion cannot introduce
 *   any visible or financially meaningful error at the one place it's used.
 *
 * Deliberately kept OUT of `src/lib/format/` (rather than added there as an
 * "exception") so that module's own absolute guarantee — and its static
 * guardrail test scanning every file in that directory for exactly this
 * token — remains literally true with no carve-out.
 */
export function toChartPlotNumber(value: DecimalString): number {
  // eslint-disable-next-line no-restricted-syntax -- disclosed chart-geometry-only exception, see doc comment above and ADR-043.
  return Number(value);
}
