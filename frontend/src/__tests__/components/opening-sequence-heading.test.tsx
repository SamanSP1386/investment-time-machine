import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OpeningSequenceHeading } from '@/components/simulation-result/opening-sequence-heading';
import type { SimulationResponse } from '@/types/api';

const replaceMock = vi.fn();
let params: URLSearchParams;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/simulation/sim-123',
  useSearchParams: () => params,
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
  cagr_percentage: '9.596872' as SimulationResponse['cagr_percentage'],
  inflation_adjusted_final_value: null,
  disclosed_splits: [],
  growth_series: [],
  calculation_version: 'v1',
  error_message: null,
  created_at: '2026-07-18T00:00:00Z',
};

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

describe('OpeningSequenceHeading', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the full sentence to assistive tech immediately, before the sequence settles', () => {
    params = new URLSearchParams('new=1');
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute(
      'aria-label',
      'If you had invested $1,000.00 in AAPL between Jan 1, 2015 and Jan 1, 2025 your investment would be worth $2,500.00 today.'
    );
    expect(heading).toHaveClass('sr-only');
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('renders only a tiny kicker label — nothing more — no status badge competing with the sentence', () => {
    params = new URLSearchParams();
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    expect(screen.getByText('Simulation result')).toBeInTheDocument();
    expect(screen.queryByText('completed')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('composes, pauses, reveals the answer, then settles and reveals the rest of the page', () => {
    vi.useFakeTimers();
    params = new URLSearchParams('new=1');
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2750);
    });

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toHaveClass('sr-only');
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('skips straight to the settled state on click, with no information loss', () => {
    params = new URLSearchParams('new=1');
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toHaveClass('sr-only');
    expect(heading).toHaveAttribute('aria-label', expect.stringContaining('your investment would be worth $2,500.00 today.'));
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('never plays the sequence for a revisited simulation (no ?new=1 marker) — settled immediately', () => {
    params = new URLSearchParams();
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toHaveClass('sr-only');
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('never plays the sequence when the user prefers reduced motion, even right after creation', () => {
    setReducedMotion(true);
    params = new URLSearchParams('new=1');
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toHaveClass('sr-only');
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });
});
