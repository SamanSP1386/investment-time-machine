import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimulationForm } from '@/components/simulator/simulation-form';
import { ApiError } from '@/lib/api/errors';
import type { SimulationResponse } from '@/types/api';

const pushMock = vi.fn();
const replaceMock = vi.fn((url: string) => {
  window.history.pushState({}, '', url);
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock('@/components/simulator/asset-search-combobox', () => ({
  AssetSearchCombobox: ({
    label,
    onChange,
    error,
  }: {
    label: string;
    onChange: (asset: { symbol: string; name: string; asset_type: string; currency: string } | null) => void;
    error?: string;
  }) => (
    <div>
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange({ symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', currency: 'USD' })}
      >
        Select AAPL
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  ),
}));

let availabilityData: { earliest_date: string; latest_date: string } | undefined;
vi.mock('@/hooks/use-asset-availability', () => ({
  useAssetAvailability: () => ({ data: availabilityData }),
}));

const mutateMock = vi.fn();
const resetMock = vi.fn();
let mutationState: {
  mutate: typeof mutateMock;
  reset: typeof resetMock;
  isPending: boolean;
  isSuccess: boolean;
  data: SimulationResponse | undefined;
  error: unknown;
};

vi.mock('@/hooks/use-simulation', () => ({
  useCreateSimulation: () => mutationState,
}));

function resetMutationState() {
  mutationState = {
    mutate: mutateMock,
    reset: resetMock,
    isPending: false,
    isSuccess: false,
    data: undefined,
    error: undefined,
  };
}

const validInput = {
  investmentAmount: '1000.00',
  startDate: '2015-01-01',
  endDate: '2025-01-01',
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Select AAPL' }));
  await user.type(screen.getByLabelText('Investment amount (USD)', { exact: false }), validInput.investmentAmount);
  // Native <input type="date"> doesn't reliably accept userEvent's
  // keystroke-segment typing under jsdom — set the value directly, the
  // same way a real date-picker interaction ultimately produces a
  // normalized `YYYY-MM-DD` value.
  fireEvent.change(screen.getByLabelText('Start date', { exact: false }), { target: { value: validInput.startDate } });
  fireEvent.change(screen.getByLabelText('End date', { exact: false }), { target: { value: validInput.endDate } });
}

describe('SimulationForm', () => {
  beforeEach(() => {
    resetMutationState();
    mutateMock.mockClear();
    resetMock.mockClear();
    pushMock.mockClear();
    replaceMock.mockClear();
    availabilityData = undefined;
  });

  it('disables the date fields until an asset is selected, with a hint explaining why', () => {
    render(<SimulationForm />);

    expect(screen.getByLabelText('Start date', { exact: false })).toBeDisabled();
    expect(screen.getByLabelText('End date', { exact: false })).toBeDisabled();
    expect(screen.getByText('Select an asset first to see its available date range.')).toBeInTheDocument();
  });

  it('enables the date fields once an asset is selected', async () => {
    const user = userEvent.setup();
    render(<SimulationForm />);

    await user.click(screen.getByRole('button', { name: 'Select AAPL' }));

    expect(screen.getByLabelText('Start date', { exact: false })).toBeEnabled();
    expect(screen.getByLabelText('End date', { exact: false })).toBeEnabled();
  });

  it('rejects a manually-entered date outside the selected asset’s availability window (bug 3)', async () => {
    availabilityData = { earliest_date: '2020-01-01', latest_date: '2024-12-31' };
    const user = userEvent.setup();
    render(<SimulationForm />);

    await user.click(screen.getByRole('button', { name: 'Select AAPL' }));
    await user.type(screen.getByLabelText('Investment amount (USD)', { exact: false }), '1000');
    fireEvent.change(screen.getByLabelText('Start date', { exact: false }), { target: { value: '1887-01-01' } });
    fireEvent.change(screen.getByLabelText('End date', { exact: false }), { target: { value: '2024-01-01' } });
    await user.click(screen.getByRole('button', { name: 'Run simulation' }));

    await waitFor(() =>
      expect(screen.getByText('Enter a date between 2020-01-01 and 2024-12-31.')).toBeInTheDocument()
    );
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('accepts a manually-entered date inside the availability window', async () => {
    availabilityData = { earliest_date: '2020-01-01', latest_date: '2024-12-31' };
    const user = userEvent.setup();
    render(<SimulationForm />);

    await user.click(screen.getByRole('button', { name: 'Select AAPL' }));
    await user.type(screen.getByLabelText('Investment amount (USD)', { exact: false }), '1000');
    fireEvent.change(screen.getByLabelText('Start date', { exact: false }), { target: { value: '2020-06-01' } });
    fireEvent.change(screen.getByLabelText('End date', { exact: false }), { target: { value: '2024-06-01' } });
    await user.click(screen.getByRole('button', { name: 'Run simulation' }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
  });

  it('fills every field from a one-click example preset without submitting the form (refinement 13)', async () => {
    const user = userEvent.setup();
    render(<SimulationForm />);

    await user.click(screen.getByRole('button', { name: /Tesla, Nov 2021 → Jan 2023 \(a real drawdown\)/ }));

    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Investment amount (USD)', { exact: false })).toHaveValue('5000');
    expect(screen.getByLabelText('Start date', { exact: false })).toHaveValue('2021-11-04');
    expect(screen.getByLabelText('End date', { exact: false })).toHaveValue('2023-01-03');

    await user.click(screen.getByRole('button', { name: 'Run simulation' }));
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_symbol: 'TSLA',
        investment_amount: '5000',
        start_date: '2021-11-04',
        end_date: '2023-01-03',
        include_dividends: false,
      })
    );
  });

  it('fills the Bitcoin example preset (a real catalog asset — KI-044) from the shared example-simulations config', async () => {
    const user = userEvent.setup();
    render(<SimulationForm />);

    await user.click(screen.getByRole('button', { name: /Bitcoin, 2017 → today/ }));
    await user.click(screen.getByRole('button', { name: 'Run simulation' }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ asset_symbol: 'BTC-USD', investment_amount: '10000', include_dividends: false })
    );
  });

  it('prefills from a Landing-page `?example=` query param via the same applyPreset mechanism as the chips', async () => {
    window.history.pushState({}, '', '/simulator?example=aapl-2010');
    const user = userEvent.setup();
    render(<SimulationForm />);

    expect(screen.getByLabelText('Investment amount (USD)', { exact: false })).toHaveValue('1000');
    expect(screen.getByLabelText('Start date', { exact: false })).toHaveValue('2010-01-04');
    expect(screen.getByLabelText('End date', { exact: false })).toHaveValue('2026-07-10');
    // The param is consumed and cleared, not left in the URL.
    await waitFor(() => expect(window.location.search).toBe(''));

    await user.click(screen.getByRole('button', { name: 'Run simulation' }));
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ asset_symbol: 'AAPL' }));

    window.history.pushState({}, '', '/simulator');
  });

  it('shows an inline validation error and never submits when the investment amount is invalid', async () => {
    const user = userEvent.setup();
    render(<SimulationForm />);

    await user.click(screen.getByRole('button', { name: 'Select AAPL' }));
    await user.type(screen.getByLabelText('Investment amount (USD)', { exact: false }), '-5');
    fireEvent.change(screen.getByLabelText('Start date', { exact: false }), { target: { value: '2015-01-01' } });
    fireEvent.change(screen.getByLabelText('End date', { exact: false }), { target: { value: '2025-01-01' } });
    await user.click(screen.getByRole('button', { name: 'Run simulation' }));

    await waitFor(() => expect(screen.getByText('Enter a valid positive amount')).toBeInTheDocument());
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('shows an inline validation error when the end date is not after the start date', async () => {
    const user = userEvent.setup();
    render(<SimulationForm />);

    await user.click(screen.getByRole('button', { name: 'Select AAPL' }));
    await user.type(screen.getByLabelText('Investment amount (USD)', { exact: false }), '1000');
    fireEvent.change(screen.getByLabelText('Start date', { exact: false }), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('End date', { exact: false }), { target: { value: '2015-01-01' } });
    await user.click(screen.getByRole('button', { name: 'Run simulation' }));

    await waitFor(() => expect(screen.getByText('The end date must be after the start date.')).toBeInTheDocument());
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('calls the create-simulation mutation with the exact form values on a valid submit', async () => {
    const user = userEvent.setup();
    render(<SimulationForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Run simulation' }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith({
      asset_symbol: 'AAPL',
      investment_amount: '1000.00',
      start_date: '2015-01-01',
      end_date: '2025-01-01',
      include_dividends: false,
      adjust_for_inflation: false,
    });
  });

  it('shows a named-step loading state, not a generic spinner label, while pending', () => {
    mutationState.isPending = true;
    render(<SimulationForm />);
    expect(screen.getByRole('button', { name: 'Calculating historical returns…' })).toBeInTheDocument();
  });

  it('renders the central, educational error copy (never a raw message) when historical data is missing', () => {
    mutationState.error = new ApiError({ code: 'MISSING_HISTORICAL_DATA', message: 'internal detail text' });
    render(<SimulationForm />);
    expect(screen.getByText('Historical data unavailable for these dates')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Stocks and ETFs often do not have historical price data on weekends or market holidays. Please choose different dates and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('internal detail text')).not.toBeInTheDocument();
  });

  it('shows calm, educational trading-day guidance near the date inputs before submit', () => {
    render(<SimulationForm />);
    expect(screen.getByText(/don’t have price data on weekends or market holidays/)).toBeInTheDocument();
    expect(screen.getByText(/never moves your dates automatically/)).toBeInTheDocument();
  });

  it('shows no asset information panel before an asset is selected, then shows one using only already-fetched data', async () => {
    const user = userEvent.setup();
    render(<SimulationForm />);

    expect(screen.queryByText('Asset information')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select AAPL' }));

    expect(screen.getByText('Asset information')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    // The "uppercase" styling is a CSS text-transform (visual only) — the
    // underlying text node is still the raw lowercase asset_type value.
    expect(screen.getByText('stock')).toBeInTheDocument();
  });

  it('collapses the request ID / error code behind a "Technical details" disclosure, not always-visible', () => {
    mutationState.error = new ApiError({ code: 'MISSING_HISTORICAL_DATA', message: 'internal', request_id: 'req-42' });
    render(<SimulationForm />);

    const trigger = screen.getByRole('button', { name: 'Technical details' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('req-42', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('MISSING_HISTORICAL_DATA', { exact: false })).toBeInTheDocument();
  });

  it('navigates straight to the plain Results screen URL when the simulation completes — no replay marker (Founder Decision 017)', async () => {
    mutationState.isSuccess = true;
    mutationState.data = {
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
      growth_series: [],
      calculation_version: 'v2',
      error_message: null,
      created_at: '2026-07-18T00:00:00Z',
    };

    render(<SimulationForm />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/simulation/sim-123'));
    expect(screen.getByRole('button', { name: 'Calculating historical returns…' })).toBeInTheDocument();
  });

  it('navigates to the plain Results screen URL identically when the simulation failed', async () => {
    mutationState.isSuccess = true;
    mutationState.data = {
      id: 'sim-456',
      status: 'failed',
      asset_symbol: 'AAPL',
      investment_amount: '1000.00000000' as SimulationResponse['investment_amount'],
      start_date: '2015-01-01',
      end_date: '2025-01-01',
      include_dividends: false,
      adjust_for_inflation: false,
      initial_price: null,
      final_price: null,
      shares_purchased: null,
      final_value: null,
      total_return_percentage: null,
      cagr_percentage: null,
      inflation_adjusted_final_value: null,
      disclosed_splits: [],
      growth_series: [],
      calculation_version: 'v1',
      error_message: 'Historical data unavailable for the selected date range.',
      created_at: '2026-07-18T00:00:00Z',
    };

    render(<SimulationForm />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/simulation/sim-456'));
  });
});
