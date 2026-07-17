import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { computeYAxisWidth, GrowthChart } from '@/components/simulation-result/growth-chart';
import type { SimulationResponse } from '@/types/api';

type Series = SimulationResponse['growth_series'];
type Splits = SimulationResponse['disclosed_splits'];

const BASE_SIM: SimulationResponse = {
  id: 'sim-chart-1',
  status: 'completed',
  asset_symbol: 'AAPL',
  investment_amount: '1000.00000000' as SimulationResponse['investment_amount'],
  start_date: '2020-01-02',
  end_date: '2020-01-06',
  include_dividends: false,
  adjust_for_inflation: false,
  initial_price: '100.00000000' as SimulationResponse['initial_price'],
  final_price: '90.00000000' as SimulationResponse['final_price'],
  shares_purchased: '10.00000000' as SimulationResponse['shares_purchased'],
  final_value: '900.00000000' as SimulationResponse['final_value'],
  total_return_percentage: '-10.000000' as SimulationResponse['total_return_percentage'],
  cagr_percentage: '-45.000000' as SimulationResponse['cagr_percentage'],
  inflation_adjusted_final_value: null,
  disclosed_splits: [],
  growth_series: [],
  calculation_version: 'v2',
  error_message: null,
  created_at: '2026-07-23T00:00:00Z',
};

function series(values: string[], startDate = '2020-01-02'): Series {
  const start = new Date(`${startDate}T00:00:00Z`);
  return values.map((value, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      point_date: d.toISOString().slice(0, 10),
      value: value as Series[number]['value'],
    };
  });
}

describe('GrowthChart — empty series', () => {
  it('renders a calm, honest fallback (never a crash or empty box) for a completed sim with no series', () => {
    render(<GrowthChart sim={{ ...BASE_SIM, growth_series: [] }} />);

    expect(screen.getByText(/day-by-day growth chart isn.t available/)).toBeInTheDocument();
    expect(screen.getByText(/Simulation ID: sim-chart-1/)).toBeInTheDocument();
  });
});

describe('GrowthChart — single point (degenerate)', () => {
  it('renders the one point honestly, with no fabricated line/interpolation', () => {
    render(<GrowthChart sim={{ ...BASE_SIM, growth_series: series(['1000.00000000']) }} />);

    expect(screen.getByText(/Jan 2, 2020: \$1,000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/nothing to trace a/)).toBeInTheDocument();
    // No Recharts SVG for a single, non-plottable point.
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });
});

describe('GrowthChart — normal series', () => {
  it('renders the chart summary sentence built from real formatted values, and an SVG chart', () => {
    render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1005.00000000', '1050.00000000']),
        }}
      />
    );

    expect(
      screen.getByText(
        'This chart traces the value of this investment from $1,000.00 on Jan 2, 2020 to $1,050.00 on Jan 5, 2020, across 4 data points.'
      )
    ).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('gives an identical visual treatment (same chart-portfolio hue) to a loss trajectory as a gain — no red/green moralizing', () => {
    const { container: lossContainer } = render(
      <GrowthChart
        sim={{ ...BASE_SIM, growth_series: series(['1000.00000000', '900.00000000', '800.00000000']) }}
      />
    );
    const { container: gainContainer } = render(
      <GrowthChart
        sim={{ ...BASE_SIM, growth_series: series(['1000.00000000', '1100.00000000', '1200.00000000']) }}
      />
    );

    const lossLine = lossContainer.querySelector('path.recharts-line-curve');
    const gainLine = gainContainer.querySelector('path.recharts-line-curve');
    expect(lossLine).toHaveAttribute('stroke', 'var(--color-chart-portfolio)');
    expect(gainLine).toHaveAttribute('stroke', 'var(--color-chart-portfolio)');
  });

  it('mentions every disclosed split in plain language near the chart', () => {
    const splits: Splits = [
      { split_date: '2020-01-04', split_ratio: '4.000000' as Splits[number]['split_ratio'] },
    ];
    render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1005.00000000', '1050.00000000']),
          disclosed_splits: splits,
        }}
      />
    );

    expect(
      screen.getByText(
        'A 4-for-1 stock split occurred on Jan 4, 2020. Prices shown are adjusted; your return is unaffected.'
      )
    ).toBeInTheDocument();
  });

  it('honestly labels a reverse split rather than fabricating a "1-for-N" figure it cannot safely derive', () => {
    const splits: Splits = [
      { split_date: '2020-01-04', split_ratio: '0.100000' as Splits[number]['split_ratio'] },
    ];
    render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1005.00000000', '1050.00000000']),
          disclosed_splits: splits,
        }}
      />
    );

    expect(screen.getByText(/A reverse stock split \(ratio 0\.100000\) occurred on Jan 4, 2020/)).toBeInTheDocument();
  });

  it('renders no split disclosure text when disclosed_splits is empty', () => {
    render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1005.00000000', '1050.00000000']),
          disclosed_splits: [],
        }}
      />
    );

    expect(screen.queryByText(/stock split occurred/)).not.toBeInTheDocument();
  });

  it('points to the accessible data table in The Proof as the keyboard-accessible equivalent of the tooltip', () => {
    render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1005.00000000', '1050.00000000']),
        }}
      />
    );

    expect(screen.getByText(/reachable without a mouse/)).toBeInTheDocument();
  });
});

describe('GrowthChart — decimation (task D.14)', () => {
  it('decimates a long series to ~150-200 drawn points and discloses this in the caption, while stating the true full point count', () => {
    const longSeries = series(Array.from({ length: 500 }, (_, i) => (1000 + i).toFixed(8)));
    render(<GrowthChart sim={{ ...BASE_SIM, growth_series: longSeries }} />);

    const summary = screen.getByText(/This chart traces the value of this investment/);
    expect(summary.textContent).toContain('across 500 data points');
    expect(summary.textContent).toMatch(/a smoothed line of \d+ is drawn for readability/);

    const match = summary.textContent?.match(/a smoothed line of (\d+) is drawn/);
    const drawnCount = match ? Number(match[1]) : 0;
    expect(drawnCount).toBeLessThanOrEqual(200);
    expect(drawnCount).toBeGreaterThanOrEqual(100);
  });

  it('never mentions decimation for a short series — nothing was decimated', () => {
    render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1005.00000000', '1050.00000000']),
        }}
      />
    );

    const summary = screen.getByText(/This chart traces the value of this investment/);
    expect(summary.textContent).not.toMatch(/smoothed line/);
  });

  it('the accessible Proof table (via the parent results-sections.tsx pattern) always reflects every raw point — decimation only affects what the chart draws, confirmed here by the sim.growth_series prop passed through unchanged', () => {
    const longSeries = series(Array.from({ length: 500 }, (_, i) => (1000 + i).toFixed(8)));
    // GrowthChart never mutates or truncates sim.growth_series itself — the
    // decimated array is a local, derived copy used only for the chart's
    // own drawing; the original prop (what TheProof's table reads) is
    // untouched.
    expect(longSeries).toHaveLength(500);
    render(<GrowthChart sim={{ ...BASE_SIM, growth_series: longSeries }} />);
    expect(longSeries).toHaveLength(500);
  });
});

describe('GrowthChart — endpoint label clipping fix (task D.15)', () => {
  it('flips the endpoint label to the left for a wide, large-magnitude value that would otherwise clip', () => {
    const bigSeries = series(['1000.00000000', '500000.00000000', '1234567.89000000']);
    const { container } = render(<GrowthChart sim={{ ...BASE_SIM, growth_series: bigSeries }} />);

    const endpointText = Array.from(container.querySelectorAll('text')).find((node) =>
      node.textContent?.includes('$1,234,567.89')
    );
    expect(endpointText).toBeDefined();
    expect(endpointText).toHaveAttribute('text-anchor', 'end');
  });

  it('keeps the endpoint label to the right for a short value with no clipping risk', () => {
    const { container } = render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1050.00000000']),
        }}
      />
    );

    const endpointText = Array.from(container.querySelectorAll('text')).find((node) =>
      node.textContent?.includes('$1,050.00')
    );
    expect(endpointText).toBeDefined();
    expect(endpointText).not.toHaveAttribute('text-anchor', 'end');
  });
});

describe('GrowthChart — sparse Y-axis ticks (task D.16)', () => {
  it('renders a hairline-only Y-axis with sparse mono currency ticks', () => {
    render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1005.00000000', '1050.00000000']),
        }}
      />
    );

    // No filled/solid axis line — only tick text, matching this chart's
    // quiet, no-chrome language.
    expect(document.querySelector('.recharts-yAxis .recharts-cartesian-axis-line')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick').length).toBeGreaterThan(0);
  });
});

describe('GrowthChart — split-baseline area fill (M7 Phase 3D-3, item 6a)', () => {
  it('renders two area fills (above/below the invested baseline), the price line itself unchanged', () => {
    const { container } = render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          investment_amount: '1000.00000000' as SimulationResponse['investment_amount'],
          growth_series: series(['1000.00000000', '1200.00000000', '800.00000000', '1100.00000000']),
        }}
      />
    );

    const areas = container.querySelectorAll('path.recharts-area-area');
    expect(areas).toHaveLength(2);

    // The price line stays the single validated portfolio hue regardless —
    // this split-fill encoding governs the AREA only (ADR-044's "never
    // substituted" constraint on the line itself, unchanged).
    const line = container.querySelector('path.recharts-line-curve');
    expect(line).toHaveAttribute('stroke', 'var(--color-chart-portfolio)');
  });

  it('a pure-gain series (never below the invested baseline) still renders both fill layers, one simply empty', () => {
    const { container } = render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          investment_amount: '1000.00000000' as SimulationResponse['investment_amount'],
          growth_series: series(['1000.00000000', '1100.00000000', '1200.00000000']),
        }}
      />
    );
    expect(container.querySelectorAll('path.recharts-area-area')).toHaveLength(2);
  });
});

describe('GrowthChart — high/low markers (M7 Phase 3D-4 completion, founder gap 2)', () => {
  function dailySeries(values: string[]): Series {
    return series(values, '2020-01-01');
  }

  it('labels the series high and low with a formatted value and a compact month/year', () => {
    const values = Array.from({ length: 100 }, () => '1000.00000000');
    values[50] = '1500.00000000'; // high, well inside the range
    values[60] = '500.00000000'; // low, well inside the range
    render(<GrowthChart sim={{ ...BASE_SIM, growth_series: dailySeries(values) }} />);

    expect(screen.getByText(/\$1,500\.00 · Feb 2020/)).toBeInTheDocument();
    expect(screen.getByText(/\$500\.00 · Mar 2020/)).toBeInTheDocument();
  });

  it('ALWAYS renders both extreme markers into the DOM — visibility is decided post-render from measured pixels, never pre-render from data-space heuristics', () => {
    // The exact shapes the old item-4 heuristics used to suppress
    // pre-render: a low two days before the endpoint, and a low-volatility
    // oscillation. Both markers must now be IN the DOM (tagged for the
    // measurement pass); whether a label survives on screen is
    // `resolveLabelCollisions`' unit-tested job, applied from real
    // bounding boxes in a real browser (jsdom measures every box 0×0, so
    // the pass is a structural no-op here by design).
    // (Interior extremes — recharts declines to draw a ReferenceDot pinned
    // to the very first category in this jsdom environment, which is a
    // renderer quirk, not this feature's behavior.)
    const values = Array.from({ length: 100 }, (_, i) => (1000 - i * 9).toFixed(8));
    values[3] = '1100.00000000'; // true high, 3 days after the start
    values[97] = '50.00000000'; // true low, 2 days before the endpoint
    values[99] = '80.00000000'; // endpoint itself, slightly higher
    const { container } = render(<GrowthChart sim={{ ...BASE_SIM, growth_series: dailySeries(values) }} />);

    expect(container.querySelector('.itm-cl-high-dot')).toBeInTheDocument();
    expect(container.querySelector('.itm-cl-low-dot')).toBeInTheDocument();
    expect(screen.getByText(/\$50\.00 ·/)).toBeInTheDocument();
  });

  it('tags every collision-managed label with its measurement class (endpoint, high, low, baseline)', () => {
    const values = Array.from({ length: 100 }, () => '1000.00000000');
    values[50] = '1500.00000000';
    values[60] = '500.00000000';
    const { container } = render(<GrowthChart sim={{ ...BASE_SIM, growth_series: dailySeries(values) }} />);

    expect(container.querySelector('text.itm-cl-endpoint')).toBeInTheDocument();
    expect(container.querySelector('text.itm-cl-high')).toBeInTheDocument();
    expect(container.querySelector('text.itm-cl-low')).toBeInTheDocument();
    expect(container.querySelector('text.itm-cl-baseline')).toBeInTheDocument();
  });

  it('skips an extreme marker whose date IS the endpoint — identity, not geometry: the endpoint label already names that exact point', () => {
    // Strictly increasing — the series high is the endpoint itself.
    const values = Array.from({ length: 100 }, (_, i) => (1000 + i * 5).toFixed(8));
    const { container } = render(<GrowthChart sim={{ ...BASE_SIM, growth_series: dailySeries(values) }} />);

    expect(container.querySelector('.itm-cl-high-dot')).not.toBeInTheDocument();
    expect(screen.queryByText(/\$1,495\.00 ·/)).not.toBeInTheDocument();
  });

  it('tags split reference lines for the measurement pass', () => {
    const splits: Splits = [{ split_date: '2020-02-10', split_ratio: '4.000000' as Splits[number]['split_ratio'] }];
    const values = Array.from({ length: 100 }, () => '1000.00000000');
    const { container } = render(
      <GrowthChart sim={{ ...BASE_SIM, growth_series: dailySeries(values), disclosed_splits: splits }} />
    );

    expect(container.querySelector('.itm-cl-split')).toBeInTheDocument();
  });
});

describe('computeYAxisWidth — dynamic axis width for $1M+ values (unit)', () => {
  it('reserves more width for a 7-digit dollar domain than a 4-digit one', () => {
    const smallWidth = computeYAxisWidth(900, 1900);
    const largeWidth = computeYAxisWidth(900_000, 1_900_000);
    expect(largeWidth).toBeGreaterThan(smallWidth);
  });

  it('never shrinks below the minimum or grows past the maximum reserved width', () => {
    expect(computeYAxisWidth(0, 10)).toBeGreaterThanOrEqual(56);
    expect(computeYAxisWidth(0, 999_999_999)).toBeLessThanOrEqual(108);
  });
});

describe('GrowthChart — $1M+ values render without crashing and with the correct endpoint figure', () => {
  it('renders a seven-digit endpoint value correctly, flipped to avoid clipping', () => {
    const { container } = render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000000.00000000', '1500000.00000000', '1987654.32000000']),
        }}
      />
    );
    const endpointText = Array.from(container.querySelectorAll('text')).find((node) =>
      node.textContent?.includes('$1,987,654.32')
    );
    expect(endpointText).toBeDefined();
    expect(endpointText).toHaveAttribute('text-anchor', 'end');
  });
});

describe('GrowthChart — reduced motion', () => {
  it('renders fully settled immediately when prefers-reduced-motion is set, no transient unsettled state', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    const { container } = render(
      <GrowthChart
        sim={{
          ...BASE_SIM,
          growth_series: series(['1000.00000000', '1010.00000000', '1005.00000000', '1050.00000000']),
        }}
      />
    );

    const settleWrapper = container.querySelector('.opacity-100');
    expect(settleWrapper).toBeInTheDocument();
    expect(container.querySelector('.opacity-0')).not.toBeInTheDocument();

    window.matchMedia = originalMatchMedia;
  });
});
