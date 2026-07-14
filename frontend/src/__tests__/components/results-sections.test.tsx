import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  GrowthOverTime,
  KeyTakeaways,
  SupportingFacts,
  TheProof,
  WhyExplanation,
} from '@/components/simulation-result/results-sections';
import type { SimulationResponse } from '@/types/api';

type Series = SimulationResponse['growth_series'];

function seriesFrom(values: string[], startDate = '2020-01-01'): Series {
  const start = new Date(`${startDate}T00:00:00Z`);
  return values.map((value, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { point_date: d.toISOString().slice(0, 10), value: value as Series[number]['value'] };
  });
}

vi.mock('@/hooks/use-asset-detail', () => ({
  useAssetDetail: vi.fn(() => ({ data: undefined, isPending: true, isError: false })),
}));

const { useAssetDetail } = await import('@/hooks/use-asset-detail');

function setReducedMotion(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

const BASE_SIM: SimulationResponse = {
  id: 'sim-123',
  status: 'completed',
  asset_symbol: 'AAPL',
  investment_amount: '1000.00000000' as SimulationResponse['investment_amount'],
  start_date: '2015-01-01',
  end_date: '2025-01-01',
  include_dividends: false,
  adjust_for_inflation: false,
  initial_price: '100.00000000' as SimulationResponse['initial_price'],
  final_price: '250.00000000' as SimulationResponse['final_price'],
  shares_purchased: '10.00000000' as SimulationResponse['shares_purchased'],
  final_value: '2500.00000000' as SimulationResponse['final_value'],
  total_return_percentage: '150.000000' as SimulationResponse['total_return_percentage'],
  cagr_percentage: '9.594448' as SimulationResponse['cagr_percentage'],
  inflation_adjusted_final_value: null,
  disclosed_splits: [],
  growth_series: [
    { point_date: '2015-01-01', value: '1000.00000000' as SimulationResponse['growth_series'][number]['value'] },
    { point_date: '2025-01-01', value: '2500.00000000' as SimulationResponse['growth_series'][number]['value'] },
  ],
  calculation_version: 'v2',
  error_message: null,
  created_at: '2026-07-18T00:00:00Z',
};

describe('WhyExplanation', () => {
  it('describes price appreciation including the shares this investment purchased', () => {
    render(<WhyExplanation sim={BASE_SIM} />);
    expect(
      screen.getByText(/moved from \$100\.00 to \$250\.00 over this period, carrying the 10\.00 shares/)
    ).toBeInTheDocument();
  });

  it('falls back to generic price-appreciation copy when initial/final price are unavailable', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, initial_price: null, final_price: null }} />);
    expect(screen.getByText(/share price moving over this period is the single largest driver/)).toBeInTheDocument();
  });

  it('states plainly that dividends were excluded by choice when include_dividends is false', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, include_dividends: false }} />);
    expect(screen.getByText(/did not reinvest dividends, by choice/)).toBeInTheDocument();
  });

  it('explains dividend reinvestment, hedged with "any... if any occurred", when include_dividends is true', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, include_dividends: true }} />);
    expect(screen.getByText(/Any dividends AAPL paid during this period were reinvested automatically/)).toBeInTheDocument();
  });

  it('omits the inflation paragraph entirely when adjustment was not requested, rather than showing filler', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, adjust_for_inflation: false }} />);
    expect(screen.queryByText('Inflation adjustment')).not.toBeInTheDocument();
  });

  it('reports the inflation-adjusted figure when adjust_for_inflation is true and the value is available', () => {
    render(
      <WhyExplanation
        sim={{
          ...BASE_SIM,
          adjust_for_inflation: true,
          inflation_adjusted_final_value: '2100.00000000' as SimulationResponse['inflation_adjusted_final_value'],
        }}
      />
    );
    expect(screen.getByText('Inflation adjustment')).toBeInTheDocument();
    expect(screen.getByText(/represents \$2,100\.00 in today's purchasing power/)).toBeInTheDocument();
  });

  it('states the CPI data gap plainly when adjust_for_inflation is true but the value is unavailable', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, adjust_for_inflation: true, inflation_adjusted_final_value: null }} />);
    expect(screen.getByText(/CPI data needed for this exact period wasn't available/)).toBeInTheDocument();
  });
});

describe('SupportingFacts', () => {
  it('FD-018 rule 5: under reduced motion, every stat figure renders its final scrambled text on the very first render', () => {
    setReducedMotion(true);
    render(<SupportingFacts sim={BASE_SIM} />);

    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('+150.00%')).toBeInTheDocument();
    expect(screen.getByText('+9.59%')).toBeInTheDocument();
  });

  it('item 4 (M7 Phase 3D-3): no per-stat "Source" disclosure — the founder found the three formula toggles noisy', () => {
    setReducedMotion(true);
    render(<SupportingFacts sim={BASE_SIM} />);
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
  });

  it('applies the restrained negative tint to Total Return/CAGR for a loss, but never to Final Value', () => {
    setReducedMotion(true);
    const lossSim: SimulationResponse = {
      ...BASE_SIM,
      final_value: '724.02000000' as SimulationResponse['final_value'],
      total_return_percentage: '-27.598000' as SimulationResponse['total_return_percentage'],
      cagr_percentage: '-27.580000' as SimulationResponse['cagr_percentage'],
    };
    render(<SupportingFacts sim={lossSim} />);

    const finalValue = screen.getByText('$724.02');
    const totalReturn = screen.getByText('−27.60%');
    const cagr = screen.getByText('−27.58%');

    expect(finalValue.className).not.toMatch(/negative-tint/);
    expect(totalReturn.className).toMatch(/negative-tint/);
    expect(cagr.className).toMatch(/negative-tint/);
  });

  it('KI-050: a 5-6 digit percentage (a real long-horizon return past the old NUMERIC(10,6) ceiling) renders in full, unclipped, with no digit-count assumption', () => {
    setReducedMotion(true);
    // Real figures from the AAPL 2000-01-03 -> 2026-07-10 repro that used to
    // overflow the backend's old NUMERIC(10, 6) column (KI-050).
    const longHorizonSim: SimulationResponse = {
      ...BASE_SIM,
      final_value: '315496.06043164' as SimulationResponse['final_value'],
      total_return_percentage: '31449.606043' as SimulationResponse['total_return_percentage'],
      cagr_percentage: '24.235140' as SimulationResponse['cagr_percentage'],
    };
    render(<SupportingFacts sim={longHorizonSim} />);

    const totalReturn = screen.getByText('+31449.61%');
    expect(totalReturn).toBeInTheDocument();
    expect(totalReturn.className).not.toMatch(/negative-tint/);
  });

  it('FD-018 rule 6: a gain and a loss get the identical motion/structure treatment — only the negative-tint color class differs, per direct instruction', () => {
    setReducedMotion(true);
    const gainSim = BASE_SIM;
    const lossSim: SimulationResponse = {
      ...BASE_SIM,
      total_return_percentage: '-27.598000' as SimulationResponse['total_return_percentage'],
      cagr_percentage: '-27.580000' as SimulationResponse['cagr_percentage'],
    };

    const { unmount } = render(<SupportingFacts sim={gainSim} />);
    const gainReturnClass = screen.getByText('+150.00%').className;
    unmount();

    render(<SupportingFacts sim={lossSim} />);
    const lossReturnClass = screen.getByText('−27.60%').className;

    const withoutTint = (className: string) => className.replace(/\btext-negative-tint\b|\btext-ink-primary\b/g, '').trim();
    expect(withoutTint(gainReturnClass)).toBe(withoutTint(lossReturnClass));
  });
});

describe('GrowthOverTime', () => {
  it('renders the section landmark and delegates to the chart / its fallback', () => {
    render(<GrowthOverTime sim={{ ...BASE_SIM, growth_series: [] }} />);
    expect(screen.getByRole('region', { name: 'Growth over time' })).toBeInTheDocument();
    expect(screen.getByText(/day-by-day growth chart isn.t available/)).toBeInTheDocument();
  });

  it('renders the chart summary once growth_series is populated', () => {
    render(<GrowthOverTime sim={BASE_SIM} />);
    expect(screen.getByText(/This chart traces the value of this investment/)).toBeInTheDocument();
  });
});

describe('TheProof', () => {
  it('is collapsed by default, never hidden', () => {
    render(<TheProof sim={BASE_SIM} />);
    const trigger = screen.getByRole('button', { name: 'The Proof — methodology & data' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Never hidden — the methodology text is already in the DOM, just collapsed.
    expect(screen.getByText(/never adjusted-close/)).toBeInTheDocument();
  });

  it('item 5a: leads with "In plain terms" — a non-technical, personalized summary', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(screen.getByText('In plain terms')).toBeInTheDocument();
    expect(screen.getByText(/AAPL's actual daily closing price between/)).toBeInTheDocument();
    expect(screen.getByText(/never predict the future|does not predict the future/)).toBeInTheDocument();
  });

  it('item 5a: states plainly whether dividends/inflation were applied, personalized to this simulation', () => {
    render(<TheProof sim={{ ...BASE_SIM, include_dividends: true, adjust_for_inflation: true }} />);
    expect(screen.getByText(/reinvested — each one bought additional shares/)).toBeInTheDocument();
    expect(screen.getByText(/adjusted for inflation, using actual historical CPI data/)).toBeInTheDocument();
  });

  it('explains methodology: close_price policy and the 365.25-day CAGR convention, sourced from simulation_formulas.md', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(screen.getByText(/never adjusted-close/)).toBeInTheDocument();
    expect(screen.getByText(/365\.25-day year/)).toBeInTheDocument();
  });

  it('item 4/5b: "How each figure is computed" carries the three formulas moved off the per-stat Source disclosures', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(screen.getByText('How each figure is computed:')).toBeInTheDocument();
    expect(screen.getByText('((final_value − investment_amount) / investment_amount) × 100')).toBeInTheDocument();
    expect(screen.getByText('(final_value / investment_amount) ^ (1 / years) − 1')).toBeInTheDocument();
  });

  it('states assumptions: exact-date prices, dividend timing, and the CPI as-of lookup', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(screen.getByText(/a weekend or holiday is never shifted/)).toBeInTheDocument();
    expect(screen.getByText(/on their ex-dividend date, in order/)).toBeInTheDocument();
    expect(screen.getByText(/most recent CPI reading on or before/)).toBeInTheDocument();
  });

  it('item 5d: shows a Technical Record — calculation version, simulation ID, and a formatted (not raw ISO) created timestamp', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(screen.getByText('Technical record')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('sim-123')).toBeInTheDocument();
    expect(screen.queryByText('2026-07-18T00:00:00Z')).not.toBeInTheDocument();
    expect(screen.getByText('Jul 18, 2026, 12:00 AM UTC')).toBeInTheDocument();
  });

  it('does not fetch the data source until the disclosure is actually opened', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(useAssetDetail).toHaveBeenCalledWith('AAPL', false);
  });

  it('fetches and renders the data source once the disclosure is opened', () => {
    vi.mocked(useAssetDetail).mockReturnValue({
      data: { data_source: 'yfinance' } as never,
      isPending: false,
      isError: false,
    } as never);
    render(<TheProof sim={BASE_SIM} />);

    const trigger = screen.getByRole('button', { name: 'The Proof — methodology & data' });
    fireEvent.click(trigger);

    expect(useAssetDetail).toHaveBeenLastCalledWith('AAPL', true);
  });

  it('renders the accessible growth-chart data table with real formatted values', () => {
    render(<TheProof sim={BASE_SIM} />);
    // Scoped to the table itself: Recharts appends a persistent, hidden
    // #recharts_measurement_span directly to document.body (outside the
    // React tree RTL's cleanup() unmounts) that can coincidentally contain
    // the same date text from an earlier test's chart in this same file —
    // a real Recharts quirk, not a bug in this component.
    const table = screen.getByRole('table');
    expect(within(table).getByText('Jan 1, 2015')).toBeInTheDocument();
    expect(within(table).getByText('Jan 1, 2025')).toBeInTheDocument();
    expect(table).toHaveTextContent('$2,500.00');
  });

  it('states plainly when no growth-series data is available, rather than an empty table', () => {
    render(<TheProof sim={{ ...BASE_SIM, growth_series: [] }} />);
    expect(screen.getByText('No growth-series data is available for this simulation.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('KeyTakeaways (M7 Phase 3D-4, item 7)', () => {
  it('always includes the non-predictive time-horizon observation and the standing educational disclaimer', () => {
    render(<KeyTakeaways sim={BASE_SIM} />);
    expect(
      screen.getByText(/one continuous holding from Jan 1, 2015 to Jan 1, 2025.*not a projection of what happens next/)
    ).toBeInTheDocument();
    expect(
      screen.getByText('Investment Time Machine is an educational tool — not financial advice.')
    ).toBeInTheDocument();
  });

  it('renders 3-4 deterministic bullets for a typical varied series, never fewer than 3', () => {
    render(
      <KeyTakeaways
        sim={{ ...BASE_SIM, growth_series: seriesFrom(['1000.00000000', '1200.00000000', '900.00000000', '2500.00000000']) }}
      />
    );
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole('listitem').length).toBeLessThanOrEqual(4);
  });

  it('describes the real recorded range using selected (not calculated) high/low points', () => {
    render(
      <KeyTakeaways
        sim={{ ...BASE_SIM, growth_series: seriesFrom(['1000.00000000', '1200.00000000', '900.00000000', '2500.00000000']) }}
      />
    );
    expect(screen.getByText(/ranged from \$900\.00 \(on Jan 3, 2020\) to \$2,500\.00 \(on Jan 4, 2020\)/)).toBeInTheDocument();
  });

  it('describes a genuine interior drawdown and recovery in dollar terms, never as a computed percentage', () => {
    render(
      <KeyTakeaways
        sim={{
          ...BASE_SIM,
          growth_series: seriesFrom(['1000.00000000', '700.00000000', '1300.00000000']),
          end_date: '2020-01-03',
        }}
      />
    );
    const recovery = screen.getByText(/lowest value recorded during this period was \$700\.00/);
    expect(recovery.textContent).not.toMatch(/%/);
    expect(recovery.textContent).toMatch(/was not the final word/);
  });

  it('never claims a recovery for a monotonically rising series — the "low" is just the starting price, not a dip', () => {
    render(
      <KeyTakeaways
        sim={{ ...BASE_SIM, growth_series: seriesFrom(['1000.00000000', '1500.00000000', '2500.00000000']) }}
      />
    );
    expect(screen.queryByText(/was not the final word/)).not.toBeInTheDocument();
  });

  it('includes a dividend-contribution observation only when dividends were actually reinvested', () => {
    const { rerender } = render(<KeyTakeaways sim={{ ...BASE_SIM, include_dividends: false }} />);
    expect(screen.queryByText(/Dividend reinvestment was enabled/)).not.toBeInTheDocument();

    rerender(<KeyTakeaways sim={{ ...BASE_SIM, include_dividends: true }} />);
    expect(screen.getByText(/Dividend reinvestment was enabled for this simulation/)).toBeInTheDocument();
  });

  it('includes a split observation only when a split was actually disclosed, pluralized correctly', () => {
    const splits: SimulationResponse['disclosed_splits'] = [
      { split_date: '2020-06-01', split_ratio: '4.000000' as SimulationResponse['disclosed_splits'][number]['split_ratio'] },
    ];
    render(<KeyTakeaways sim={{ ...BASE_SIM, disclosed_splits: splits }} />);
    expect(screen.getByText(/1 stock split occurred during this window/)).toBeInTheDocument();
  });

  it('never uses imperative "you should" advice language anywhere in the rendered bullets', () => {
    render(
      <KeyTakeaways
        sim={{
          ...BASE_SIM,
          include_dividends: true,
          growth_series: seriesFrom(['1000.00000000', '700.00000000', '1300.00000000', '2500.00000000']),
        }}
      />
    );
    const list = screen.getByRole('list');
    expect(list.textContent).not.toMatch(/you should/i);
    expect(list.textContent).not.toMatch(/\byou need to\b/i);
  });

  it('degrades honestly (never crashes, never fabricates) to just the always-available time-horizon bullet for a degenerate empty series with no final value', () => {
    render(<KeyTakeaways sim={{ ...BASE_SIM, final_value: null, growth_series: [] }} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/one continuous holding from/)).toBeInTheDocument();
  });
});
