/**
 * Measurement-based label collision resolution for the Growth Chart
 * (M7 Phase 3D-4 completion, founder gap 2).
 *
 * The previous approach (item 4 of the original 3D-4 pass) predicted
 * collisions from the DATA — day-span guards, domain-fraction value guards
 * (`markersTooCloseByValue`, `isFarEnoughFromEndpointAndStart`) — and
 * omitted markers pre-render. The founder verified that collisions
 * persisted anyway: data-space prediction cannot see what text actually
 * occupies on screen (font metrics, label length, chart aspect ratio,
 * viewport width all change the answer). This module replaces prediction
 * with observation: `growth-chart.tsx` measures the real bounding boxes of
 * every rendered label AFTER render and passes them here; this pure
 * function decides, deterministically, what shifts or hides.
 *
 * Priority (founder-specified): endpoint > high/low > splits > ticks. The
 * invested-baseline label is slotted with the splits tier — contextual
 * annotation, not the answer itself. Resolution strategies, in order:
 * side-flip / vertical offset (candidate shifts), then hiding the
 * lower-priority label. Hiding never loses data — every hidden label's
 * value remains in the tooltip and in The Proof's data table.
 *
 * Pure and exported for direct unit testing — the DOM-measurement side
 * (`useChartLabelCollisions` in growth-chart.tsx) stays a thin adapter.
 */

/* eslint-disable no-restricted-syntax --
   Every comparison in this module is pixel-space bounding-box geometry
   (getBoundingClientRect output — plain numbers), the same disclosed
   non-financial category ADR-033 exempts. No DecimalString ever enters
   this file: its types admit only `number` coordinates, so a per-line
   disable would repeat the identical justification fourteen times. */

export type ChartLabelKind = 'endpoint' | 'high' | 'low' | 'baseline' | 'split' | 'tick';

/** A rendered label's real, container-relative bounding box (px). */
export interface MeasuredLabel {
  id: string;
  kind: ChartLabelKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartBounds {
  width: number;
  height: number;
}

export type LabelResolution = { id: string; action: 'shift'; dx: number; dy: number } | { id: string; action: 'hide' };

/** Higher wins a collision; the founder-specified order. */
const KIND_PRIORITY: Record<ChartLabelKind, number> = {
  endpoint: 4,
  high: 3,
  low: 3,
  baseline: 2,
  split: 2,
  tick: 1,
};

/** Breathing room requirement between labels — boxes closer than this count as colliding. */
const COLLISION_PADDING_PX = 2;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width + COLLISION_PADDING_PX &&
    b.x < a.x + a.width + COLLISION_PADDING_PX &&
    a.y < b.y + b.height + COLLISION_PADDING_PX &&
    b.y < a.y + a.height + COLLISION_PADDING_PX
  );
}

function shifted(box: Box, dx: number, dy: number): Box {
  return { ...box, x: box.x + dx, y: box.y + dy };
}

function insideBounds(box: Box, bounds: ChartBounds): boolean {
  return box.x >= 0 && box.y >= 0 && box.x + box.width <= bounds.width && box.y + box.height <= bounds.height;
}

/**
 * Candidate shifts per kind, tried in order. Directions follow each label's
 * own anchoring: the high marker's label sits ABOVE its point, so its
 * escape routes are further up or a side-step; the low marker's label sits
 * BELOW its point, so it escapes downward — plus one "flip" candidate each
 * (below/above the point instead), the side-flip strategy. The endpoint is
 * never offered `hide` — it IS the answer — so its candidate list is only
 * consulted for shifts and it otherwise stays put; lower-priority labels
 * move around it instead.
 */
function candidateShifts(label: MeasuredLabel): Array<{ dx: number; dy: number }> {
  switch (label.kind) {
    case 'endpoint':
      return [{ dx: 0, dy: 0 }];
    case 'high':
      return [
        { dx: 0, dy: 0 },
        { dx: 0, dy: -10 },
        { dx: 0, dy: -18 },
        { dx: -18, dy: 0 },
        { dx: 18, dy: 0 },
        // Side-flip: below the point instead of above it.
        { dx: 0, dy: label.height + 16 },
      ];
    case 'low':
      return [
        { dx: 0, dy: 0 },
        { dx: 0, dy: 10 },
        { dx: 0, dy: 18 },
        { dx: -18, dy: 0 },
        { dx: 18, dy: 0 },
        // Side-flip: above the point instead of below it.
        { dx: 0, dy: -(label.height + 16) },
      ];
    case 'baseline':
      return [
        { dx: 0, dy: 0 },
        { dx: 0, dy: -12 },
        { dx: 0, dy: 12 },
      ];
    // Split lines and axis ticks are position-anchored — moving them would
    // misstate WHERE the split/tick is. They either stand or hide.
    case 'split':
    case 'tick':
      return [{ dx: 0, dy: 0 }];
  }
}

/**
 * Clamp-shift for the endpoint label and axis ticks: the minimal dx/dy that
 * brings an out-of-bounds box fully inside the chart. (growth-chart.tsx's
 * own render-time margin reservation already covers the common case for
 * both; this is the measured backstop for what that estimate can't
 * foresee — a font-metric mismatch, an unusual date width, a browser
 * difference.)
 */
function clampIntoBounds(box: Box, bounds: ChartBounds): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;
  if (box.x < 0) dx = -box.x;
  else if (box.x + box.width > bounds.width) dx = bounds.width - (box.x + box.width);
  if (box.y < 0) dy = -box.y;
  else if (box.y + box.height > bounds.height) dy = bounds.height - (box.y + box.height);
  return { dx, dy };
}

function hasArea(label: MeasuredLabel): boolean {
  return label.width > 0 && label.height > 0;
}

/**
 * Deterministically resolves overlaps among the measured labels.
 *
 * Processing order is priority-descending (stable within a tier, so callers
 * get identical output for identical input). Each label tries its candidate
 * shifts against everything already placed; the first candidate that stays
 * in bounds and clears all placed boxes wins. A label with no clean
 * candidate hides — except the endpoint (never hidden, clamped into bounds
 * at most) and split LINES (data marks, not text; they are obstacles other
 * labels avoid, never something this function hides).
 *
 * Zero-area boxes (e.g. jsdom, where getBoundingClientRect returns zeros)
 * are ignored entirely, making the whole pass a safe no-op outside a real
 * browser.
 */
export function resolveLabelCollisions(labels: MeasuredLabel[], bounds: ChartBounds): LabelResolution[] {
  const eligible = labels.filter(hasArea);
  const ordered = [...eligible].sort((a, b) => KIND_PRIORITY[b.kind] - KIND_PRIORITY[a.kind]);

  const resolutions: LabelResolution[] = [];
  const placed: Array<{ box: Box; kind: ChartLabelKind }> = [];

  // Split lines are immovable, never-hidden obstacles — seeded up front so
  // EVERY label (including higher-priority high/low) can steer around them,
  // and SOFT ones: labels prefer candidates that clear a split hairline,
  // but text crossing a 1px dashed line is still legible, so a split can
  // never force a label to hide.
  for (const splitLine of eligible) {
    if (splitLine.kind === 'split') placed.push({ box: splitLine, kind: 'split' });
  }

  for (const label of ordered) {
    if (label.kind === 'split') continue;

    if (label.kind === 'endpoint') {
      const { dx, dy } = clampIntoBounds(label, bounds);
      if (dx !== 0 || dy !== 0) resolutions.push({ id: label.id, action: 'shift', dx, dy });
      placed.push({ box: shifted(label, dx, dy), kind: 'endpoint' });
      continue;
    }

    // Two-tier scan: hard obstacles (other text) must always be cleared;
    // soft obstacles (split hairlines) are cleared when a candidate can,
    // tolerated when none can. Ticks never collide with each OTHER
    // meaningfully (the axis already spaces them via minTickGap), so
    // tick-vs-tick pairs are ignored outright.
    function collidesWith(candidate: Box, includeSoft: boolean): boolean {
      return placed.some(({ box, kind }) => {
        if (label.kind === 'tick' && kind === 'tick') return false;
        if (kind === 'split' && !includeSoft) return false;
        return overlaps(candidate, box);
      });
    }

    let settledBox: Box | null = null;
    for (const includeSoft of [true, false]) {
      for (const { dx, dy } of candidateShifts(label)) {
        let candidate = shifted(label, dx, dy);
        if (label.kind === 'tick') {
          // A tick's own text is meaning-bearing (WHERE it is), so it's
          // never hidden — but it's also never allowed to clip against the
          // chart's own edge. Most often this is the LAST tick, centered
          // (text-anchor: middle) on the plot's rightmost point: half its
          // width can extend past the plot area into a thin right margin,
          // straight into the SVG's own default `overflow: hidden`
          // boundary. Clamped fully into bounds instead of skipped — a
          // shift left (or right, at the domain's start), never a clip.
          // Collision with a higher-priority label below still applies to
          // this clamped position, exactly as it did before.
          const clamp = clampIntoBounds(candidate, bounds);
          candidate = shifted(candidate, clamp.dx, clamp.dy);
        } else if (!insideBounds(candidate, bounds)) {
          continue;
        }
        if (collidesWith(candidate, includeSoft)) continue;
        settledBox = candidate;
        const totalDx = candidate.x - label.x;
        const totalDy = candidate.y - label.y;
        if (totalDx !== 0 || totalDy !== 0) resolutions.push({ id: label.id, action: 'shift', dx: totalDx, dy: totalDy });
        break;
      }
      if (settledBox) break;
    }

    if (settledBox) {
      placed.push({ box: settledBox, kind: label.kind });
    } else {
      resolutions.push({ id: label.id, action: 'hide' });
    }
  }

  return resolutions;
}
