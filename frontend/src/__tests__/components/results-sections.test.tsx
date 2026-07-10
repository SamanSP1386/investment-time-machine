import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { GrowthOverTime, SupportingFacts, TheProof, WhyExplanation } from '@/components/simulation-result/results-sections';
import type { SimulationResponse } from '@/types/api';

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
    const summary = screen.getByText(
      (content, element) => element?.tagName === 'SUMMARY' && content.includes('The Proof — methodology & data')
    );
    expect(summary.closest('details')).not.toHaveAttribute('open');
  });

  it('explains methodology: close_price policy and the 365.25-day CAGR convention, sourced from simulation_formulas.md', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(screen.getByText(/never an adjusted-close shortcut/)).toBeInTheDocument();
    expect(screen.getByText(/365\.25-day-per-year/)).toBeInTheDocument();
  });

  it('states assumptions: exact-date prices, dividend timing, and the CPI as-of lookup', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(screen.getByText(/never silently shifted to the nearest trading day/)).toBeInTheDocument();
    expect(screen.getByText(/on their ex-dividend date, in the order they occurred/)).toBeInTheDocument();
    expect(screen.getByText(/most recent CPI reading on or before/)).toBeInTheDocument();
  });

  it('shows provenance: calculation version, simulation ID, and created timestamp', () => {
    render(<TheProof sim={BASE_SIM} />);
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('sim-123')).toBeInTheDocument();
    expect(screen.getByText('2026-07-18T00:00:00Z')).toBeInTheDocument();
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

    const summary = screen.getByText(
      (content, element) => element?.tagName === 'SUMMARY' && content.includes('The Proof — methodology & data')
    );
    const details = summary.closest('details') as HTMLDetailsElement;
    // jsdom does not implement native click-to-toggle on <summary>; set the
    // real `open` property and dispatch the native `toggle` event React's
    // onToggle listens for, matching what a real browser does on click.
    details.open = true;
    fireEvent(details, new Event('toggle'));

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
