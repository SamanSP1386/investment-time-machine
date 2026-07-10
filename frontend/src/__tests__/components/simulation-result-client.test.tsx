import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimulationResultClient } from '@/components/simulation-result/simulation-result-client';
import { ApiError } from '@/lib/api/errors';
import type { SimulationResponse } from '@/types/api';

const refetchMock = vi.fn();
let queryState: {
  data: SimulationResponse | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
};

vi.mock('@/hooks/use-simulation', () => ({
  useSimulation: () => ({ ...queryState, refetch: refetchMock }),
}));

vi.mock('@/hooks/use-asset-detail', () => ({
  useAssetDetail: () => ({ data: undefined, isPending: true, isError: false }),
}));

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
  // Post-Founder Decision 014 (KI-021 resolved), a completed simulation's
  // GET reliably includes a real, persisted growth_series — reflected here
  // rather than the pre-M7-Phase-3C-2 empty-array default.
  growth_series: [
    { point_date: '2015-01-01', value: '1000.00000000' as SimulationResponse['growth_series'][number]['value'] },
    { point_date: '2025-01-01', value: '2500.00000000' as SimulationResponse['growth_series'][number]['value'] },
  ],
  calculation_version: 'v2',
  error_message: null,
  created_at: '2026-07-18T00:00:00Z',
};

describe('SimulationResultClient', () => {
  it('renders the literal "Loading simulation…" state while pending', () => {
    queryState = { data: undefined, isPending: true, isError: false, error: null, isFetching: true };
    render(<SimulationResultClient id="sim-123" />);

    expect(screen.getByText('Loading simulation…')).toBeInTheDocument();
  });

  it('renders ErrorState with the mapped copy when the query errors', () => {
    queryState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError({ code: 'SIMULATION_NOT_FOUND', message: 'not found', request_id: 'req-1' }),
      isFetching: false,
    };
    render(<SimulationResultClient id="missing" />);

    expect(screen.getByText('Simulation not found')).toBeInTheDocument();
    expect(screen.getByText('Run another simulation')).toBeInTheDocument();
  });

  it('renders the worked-example sentence as the hero, with the reading order Sections 1-2, 4-7 all present and rendered immediately, for a completed simulation', () => {
    queryState = { data: BASE_SIM, isPending: false, isError: false, error: null, isFetching: false };
    render(<SimulationResultClient id="sim-123" />);

    // Section 1 — a tiny kicker label, nothing more.
    expect(screen.getByText('Simulation result')).toBeInTheDocument();
    expect(screen.queryByText('completed')).not.toBeInTheDocument();

    // Section 2 — the hero sentence, the page's only real headline. Present
    // (and, per Founder Decision 017, un-gated) from the very first render.
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute(
      'aria-label',
      'If you had invested $1,000.00 in AAPL between Jan 1, 2015 and Jan 1, 2025 your investment would be worth $2,500.00 today.'
    );

    // Section 4 — Supporting Facts, plain label/value pairs, never a bordered card grid.
    expect(screen.getByText('Final Value')).toBeInTheDocument();
    expect(screen.getByText('Final Value').closest('div')).toHaveTextContent('$2,500.00');
    expect(screen.getByText('Total Return')).toBeInTheDocument();
    expect(screen.getByText('+150.00%')).toBeInTheDocument();
    expect(screen.getByText('Annual Return (CAGR)')).toBeInTheDocument();
    expect(screen.getByText('+9.59%')).toBeInTheDocument();

    // Section 5 — Growth Over Time, now backed by a real, persisted series (KI-021 resolved).
    expect(screen.getByText(/This chart traces the value of this investment/)).toBeInTheDocument();

    // Section 6 — Why. Price appreciation and dividend contribution always
    // render; inflation adjustment is omitted here since BASE_SIM did not
    // request it (adjust_for_inflation: false) — filler copy for an
    // unrequested choice is deliberately not shown (M7 Phase 3C-3).
    expect(screen.getByText('Price appreciation')).toBeInTheDocument();
    expect(screen.getByText('Dividend contribution')).toBeInTheDocument();
    expect(screen.queryByText('Inflation adjustment')).not.toBeInTheDocument();

    // Section 7 — The Proof, collapsed by default, folding in the former Snapshot/Technical Details content.
    const proofSummary = screen.getByText('Methodology, assumptions, and technical details');
    expect(proofSummary.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('sim-123')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('renders a calm processing state, no hero numbers, for a pending simulation', () => {
    queryState = {
      data: { ...BASE_SIM, status: 'pending', final_value: null, total_return_percentage: null, cagr_percentage: null },
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
    };
    render(<SimulationResultClient id="sim-123" />);

    expect(screen.getByText(/hasn.t finished calculating yet/)).toBeInTheDocument();
    expect(screen.queryByText('Final Value')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('renders the error_message via ErrorState, no hero numbers, for a failed simulation', () => {
    queryState = {
      data: {
        ...BASE_SIM,
        status: 'failed',
        final_value: null,
        total_return_percentage: null,
        cagr_percentage: null,
        error_message: 'Historical data unavailable for the selected date range.',
      },
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
    };
    render(<SimulationResultClient id="sim-123" />);

    expect(screen.getByText('Simulation could not be completed')).toBeInTheDocument();
    expect(screen.getByText('Historical data unavailable for the selected date range.')).toBeInTheDocument();
    expect(screen.queryByText('Final Value')).not.toBeInTheDocument();
  });

  it('offers a "Run another simulation" link and a "Copy link" affordance for a completed simulation', () => {
    queryState = { data: BASE_SIM, isPending: false, isError: false, error: null, isFetching: false };
    render(<SimulationResultClient id="sim-123" />);

    expect(screen.getByRole('link', { name: 'Run another simulation' })).toHaveAttribute('href', '/simulator');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
  });

  it('copies the current URL to the clipboard and shows brief confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    queryState = { data: BASE_SIM, isPending: false, isError: false, error: null, isFetching: false };
    render(<SimulationResultClient id="sim-123" />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument());
  });

  it('calls refetch when "Check again" is clicked on a pending simulation', async () => {
    queryState = {
      data: { ...BASE_SIM, status: 'pending', final_value: null, total_return_percentage: null, cagr_percentage: null },
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
    };
    const user = userEvent.setup();
    render(<SimulationResultClient id="sim-123" />);

    await user.click(screen.getByRole('button', { name: 'Check again' }));

    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});
