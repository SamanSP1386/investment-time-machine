import { describe, expect, it } from 'vitest';
import {
  resolveLabelCollisions,
  type ChartBounds,
  type MeasuredLabel,
} from '@/components/simulation-result/chart-label-layout';

/**
 * Unit coverage for the pure, measurement-based collision resolver
 * (M7 Phase 3D-4 completion, founder gap 2). Each fixture is a set of
 * REAL-shaped bounding boxes modeled on the founder's own verification
 * scenarios — the component-side measurement adapter is a thin DOM reader,
 * so the geometry decisions all live (and are all tested) here.
 */

const BOUNDS: ChartBounds = { width: 800, height: 256 };

function label(id: string, kind: MeasuredLabel['kind'], x: number, y: number, width = 110, height = 12): MeasuredLabel {
  return { id, kind, x, y, width, height };
}

function resolutionFor(resolutions: ReturnType<typeof resolveLabelCollisions>, id: string) {
  return resolutions.find((r) => r.id === id);
}

describe('resolveLabelCollisions — priority order (endpoint > high/low > splits > ticks)', () => {
  it('never hides or moves an endpoint that is in bounds, even under total overlap', () => {
    const resolutions = resolveLabelCollisions(
      [label('endpoint-0', 'endpoint', 600, 100), label('high-0', 'high', 600, 100), label('tick-0', 'tick', 600, 100)],
      BOUNDS
    );
    expect(resolutionFor(resolutions, 'endpoint-0')).toBeUndefined();
  });

  it('a high/low label crowding the endpoint (founder scenario: high/low near the endpoint) shifts away if it can', () => {
    // High label overlapping the endpoint label's box, with free space above.
    const resolutions = resolveLabelCollisions(
      [label('endpoint-0', 'endpoint', 600, 100), label('high-0', 'high', 620, 96)],
      BOUNDS
    );
    const high = resolutionFor(resolutions, 'high-0');
    expect(high).toBeDefined();
    expect(high?.action).toBe('shift');
  });

  it('hides the lower-priority label when no candidate shift clears the collision (data stays in tooltip/table)', () => {
    // Endpoint boxed into a tight corner with the high label; every shift
    // candidate stays overlapping or leaves bounds.
    const wide = 400;
    const resolutions = resolveLabelCollisions(
      [
        label('endpoint-0', 'endpoint', 200, 2, wide, 250),
        label('high-0', 'high', 210, 10, wide, 240),
      ],
      BOUNDS
    );
    expect(resolutionFor(resolutions, 'high-0')).toEqual({ id: 'high-0', action: 'hide' });
  });

  it('low-volatility short range (founder scenario: <3 months, high/low labels overlapping) — the low flips instead of stacking', () => {
    // High label above its point and low label below its point landing in
    // overlapping Y bands — the exact residual case item 4's data-space
    // guard was built for, now resolved from measured pixels.
    const resolutions = resolveLabelCollisions(
      [label('high-0', 'high', 300, 118), label('low-0', 'low', 310, 122)],
      BOUNDS
    );
    expect(resolutionFor(resolutions, 'high-0')).toBeUndefined(); // first of its tier stands
    const low = resolutionFor(resolutions, 'low-0');
    expect(low).toBeDefined();
    expect(low?.action).toBe('shift');
  });

  it('hides an axis tick that collides with a surviving higher-priority label, never the reverse', () => {
    const resolutions = resolveLabelCollisions(
      [label('low-0', 'low', 300, 230), label('tick-3', 'tick', 306, 236, 60, 12)],
      BOUNDS
    );
    expect(resolutionFor(resolutions, 'low-0')).toBeUndefined();
    expect(resolutionFor(resolutions, 'tick-3')).toEqual({ id: 'tick-3', action: 'hide' });
  });

  it('never hides a tick because of another tick — axis spacing is the axis component’s own job', () => {
    const resolutions = resolveLabelCollisions(
      [label('tick-0', 'tick', 100, 240, 60, 12), label('tick-1', 'tick', 110, 240, 60, 12)],
      BOUNDS
    );
    expect(resolutions).toEqual([]);
  });
});

describe('resolveLabelCollisions — bounds handling (founder scenario: 375px width)', () => {
  const NARROW: ChartBounds = { width: 375, height: 192 };

  it('clamp-shifts an endpoint label that overflows the chart edge back into view', () => {
    const resolutions = resolveLabelCollisions([label('endpoint-0', 'endpoint', 320, 90, 110, 13)], NARROW);
    expect(resolutionFor(resolutions, 'endpoint-0')).toEqual({ id: 'endpoint-0', action: 'shift', dx: -55, dy: 0 });
  });

  it('side-flips a low label that would render past the bottom edge (loss trajectory: low near the plot floor)', () => {
    // TSLA-loss shape: the series low sits at the bottom of the plot, its
    // below-the-point label extending past the container.
    const resolutions = resolveLabelCollisions([label('low-0', 'low', 200, 186, 110, 12)], NARROW);
    const low = resolutionFor(resolutions, 'low-0');
    expect(low).toBeDefined();
    expect(low?.action).toBe('shift');
    if (low?.action === 'shift') {
      expect(low.dy).toBeLessThan(0); // flipped/offset upward, back into view
    }
  });

  it('clamp-shifts a tick that overflows the chart edge back into view, rather than clipping or hiding it (BTC-USD 2017→today repro)', () => {
    const resolutions = resolveLabelCollisions([label('tick-0', 'tick', 340, 180, 60, 12)], NARROW);
    expect(resolutionFor(resolutions, 'tick-0')).toEqual({ id: 'tick-0', action: 'shift', dx: -25, dy: 0 });
  });

  it('leaves a tick untouched when it is already fully in bounds', () => {
    const resolutions = resolveLabelCollisions([label('tick-0', 'tick', 100, 180, 60, 12)], NARROW);
    expect(resolutionFor(resolutions, 'tick-0')).toBeUndefined();
  });
});

describe('resolveLabelCollisions — split lines (soft obstacles)', () => {
  it('prefers a shift that clears a split hairline when one exists', () => {
    // AAPL 2000→today shape: several vertical split lines; a high label
    // whose right edge grazes one, with clear space one side-step left.
    const resolutions = resolveLabelCollisions(
      [label('split-0', 'split', 352, 0, 1, 220), label('high-0', 'high', 245, 40)],
      BOUNDS
    );
    const high = resolutionFor(resolutions, 'high-0');
    expect(high).toBeDefined();
    expect(high?.action).toBe('shift');
  });

  it('never hides a label over a split hairline when no shift clears it — the line is tolerated instead', () => {
    // Split lines hemming the label in on every side: no candidate clears
    // them all, so the label stands (still legible across a 1px dash).
    const resolutions = resolveLabelCollisions(
      [
        label('split-0', 'split', 280, 0, 1, 256),
        label('split-1', 'split', 340, 0, 1, 256),
        label('high-0', 'high', 250, 40, 200, 12),
      ],
      BOUNDS
    );
    expect(resolutionFor(resolutions, 'high-0')).toBeUndefined();
  });

  it('never emits a resolution for a split line itself', () => {
    const resolutions = resolveLabelCollisions(
      [label('split-0', 'split', 352, 0, 1, 220), label('endpoint-0', 'endpoint', 350, 100)],
      BOUNDS
    );
    expect(resolutionFor(resolutions, 'split-0')).toBeUndefined();
  });
});

describe('resolveLabelCollisions — degenerate inputs', () => {
  it('ignores zero-area boxes entirely (jsdom safety: everything measures 0×0 there)', () => {
    const resolutions = resolveLabelCollisions(
      [label('endpoint-0', 'endpoint', 0, 0, 0, 0), label('high-0', 'high', 0, 0, 0, 0)],
      BOUNDS
    );
    expect(resolutions).toEqual([]);
  });

  it('is deterministic — identical input yields identical output', () => {
    const input = [
      label('endpoint-0', 'endpoint', 600, 100),
      label('high-0', 'high', 620, 96),
      label('low-0', 'low', 610, 108),
      label('tick-0', 'tick', 615, 100, 60, 12),
    ];
    expect(resolveLabelCollisions(input, BOUNDS)).toEqual(resolveLabelCollisions(input, BOUNDS));
  });
});
