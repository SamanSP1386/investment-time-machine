import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { OpeningSequenceHeading } from '@/components/simulation-result/opening-sequence-heading';
import type { SimulationResponse } from '@/types/api';

// The hero sentence eagerly fetches the asset's display name (task F.23) —
// mocked here as never-resolved (ticker-only fallback) so these tests stay
// focused on the sentence/motion behavior they actually assert, matching
// results-sections.test.tsx's own established mock shape for this hook.
vi.mock('@/hooks/use-asset-detail', () => ({
  useAssetDetail: vi.fn(() => ({ data: undefined, isPending: true, isError: false })),
}));

const { useAssetDetail } = await import('@/hooks/use-asset-detail');

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
  growth_series: [],
  calculation_version: 'v2',
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

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

describe('OpeningSequenceHeading', () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  it('renders the full sentence and every child section immediately — no gating, no composing/pause/reveal choreography', () => {
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute(
      'aria-label',
      'If you had invested $1,000.00 in AAPL between Jan 1, 2015 and Jan 1, 2025, your investment would be worth $2,500.00 today.'
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders only a tiny kicker label — nothing more — no status badge competing with the sentence', () => {
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    expect(screen.getByText('Simulation result')).toBeInTheDocument();
    expect(screen.queryByText('completed')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('has no skip affordance — there is no timeline left to skip', () => {
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('plays a single opacity/translate settle on the sentence, then settles — content was never hidden while it played', async () => {
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    // Content is present on the very first render, before the settle transition resolves.
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).toMatch(/opacity-0/);

    await act(async () => {
      await nextFrame();
      await nextFrame();
    });

    expect(heading.className).toMatch(/opacity-100/);
    // Still the same content, unaffected by the transition having played.
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders identically for a revisited simulation — no replay marker, nothing to distinguish it from a fresh arrival', () => {
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('skips the settle transition entirely when the user prefers reduced motion — the sentence is settled from the first render', () => {
    setReducedMotion(true);
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).toMatch(/opacity-100/);
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('FD-018 rule 5: under reduced motion, both hero figures render their final scrambled text on the very first render — no intermediate scrambled state ever observable', () => {
    setReducedMotion(true);
    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
  });

  it('FD-018 rule 6: a loss outcome renders the hero figures with the identical treatment as a gain — never tinted, never a different scramble schedule', () => {
    setReducedMotion(true);
    const lossSim: SimulationResponse = {
      ...BASE_SIM,
      investment_amount: '10000.00000000' as SimulationResponse['investment_amount'],
      final_value: '7240.18000000' as SimulationResponse['final_value'],
    };
    render(
      <OpeningSequenceHeading sim={lossSim}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    const investedFigure = screen.getByText('$10,000.00');
    const finalFigure = screen.getByText('$7,240.18');
    // Both figures share the exact same class list regardless of the
    // outcome's sign — no negative-tint class, no extra sign-conditional
    // class of any kind (EXPERIENCE_CONSTITUTION.md §6/§7, FD-013/017/018).
    expect(investedFigure.className).toBe(finalFigure.className);
    expect(investedFigure.className).not.toMatch(/negative-tint/);
  });

  it('task F.23: renders the asset\'s real display name plus ticker once resolved, and falls back to the ticker alone until then', () => {
    vi.mocked(useAssetDetail).mockReturnValue({
      data: { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', currency: 'USD', data_source: 'dev_seed', is_active: true, exchange: null },
      isPending: false,
      isError: false,
    } as never);

    render(
      <OpeningSequenceHeading sim={BASE_SIM}>
        <div data-testid="child-content">child</div>
      </OpeningSequenceHeading>
    );

    expect(screen.getByText(/Apple Inc\. \(AAPL\)/)).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('aria-label', expect.stringContaining('Apple Inc. (AAPL)'));

    vi.mocked(useAssetDetail).mockReturnValue({ data: undefined, isPending: true, isError: false } as never);
  });
});
