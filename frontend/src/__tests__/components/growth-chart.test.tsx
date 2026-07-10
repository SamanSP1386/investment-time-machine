import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrowthChart } from '@/components/simulation-result/growth-chart';
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
