import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AskAboutThisResult } from '@/components/simulation-result/results-sections';
import { ApiError } from '@/lib/api/errors';
import type { SimulationResponse } from '@/types/api';

vi.mock('@/lib/api/endpoints/explanations', () => ({
  askFollowUpQuestion: vi.fn(),
}));

const { askFollowUpQuestion } = await import('@/lib/api/endpoints/explanations');

const SIM = {
  id: 'sim-123',
  status: 'completed',
  asset_symbol: 'AAPL',
  investment_amount: '1000.00000000',
  start_date: '2015-01-01',
  end_date: '2025-01-01',
  include_dividends: true,
  adjust_for_inflation: false,
  initial_price: '100.00000000',
  final_price: '250.00000000',
  shares_purchased: '10.00000000',
  final_value: '2500.00000000',
  total_return_percentage: '150.000000',
  cagr_percentage: '9.594448',
  inflation_adjusted_final_value: null,
  disclosed_splits: [],
  growth_series: [],
  calculation_version: 'v2',
  error_message: null,
  created_at: '2026-07-18T00:00:00Z',
} as unknown as SimulationResponse;

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<AskAboutThisResult sim={SIM} />, { wrapper: Wrapper });
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Ask about this result' }));
}

describe('AskAboutThisResult', () => {
  it('renders collapsed by default, matching the shared Disclosure pattern', () => {
    renderPanel();

    const trigger = screen.getByRole('button', { name: 'Ask about this result' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a suggested-questions row that fills the input on click, without submitting', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openPanel(user);

    await user.click(screen.getByRole('button', { name: 'What does CAGR mean?' }));

    expect(screen.getByLabelText('Your question')).toHaveValue('What does CAGR mean?');
    expect(askFollowUpQuestion).not.toHaveBeenCalled();
  });

  it('disables the Ask button while the question input is empty', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openPanel(user);

    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();

    await user.type(screen.getByLabelText('Your question'), 'Why did dividends matter here?');

    expect(screen.getByRole('button', { name: 'Ask' })).toBeEnabled();
  });

  it('submits the trimmed question and renders the answer on success', async () => {
    vi.mocked(askFollowUpQuestion).mockResolvedValueOnce({
      id: 'exp-1',
      simulation_id: 'sim-123',
      explanation_type: 'follow_up',
      question_text: 'Why did dividends matter here?',
      explanation_text: 'Dividends compounded because reinvestment was enabled for this simulation.',
      generation_status: 'completed',
      model_name: 'llama-3.1-8b-instant',
      prompt_version: 'v1.0',
      error_message: null,
      created_at: '2026-07-23T00:00:00Z',
    });
    const user = userEvent.setup();
    renderPanel();
    await openPanel(user);

    await user.type(screen.getByLabelText('Your question'), '  Why did dividends matter here?  ');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(askFollowUpQuestion).toHaveBeenCalledWith('sim-123', 'Why did dividends matter here?');
    await waitFor(() =>
      expect(
        screen.getByText('Dividends compounded because reinvestment was enabled for this simulation.')
      ).toBeInTheDocument()
    );
  });

  it('renders a generation_status "failed" response with the same calm treatment as a successful answer, never as an error', async () => {
    vi.mocked(askFollowUpQuestion).mockResolvedValueOnce({
      id: 'exp-2',
      simulation_id: 'sim-123',
      explanation_type: 'follow_up',
      question_text: 'Why did dividends matter here?',
      explanation_text: null,
      generation_status: 'failed',
      model_name: 'none',
      prompt_version: 'v1.0',
      error_message:
        'Simulation completed successfully. AI explanation is temporarily unavailable. Your financial results remain accurate.',
      created_at: '2026-07-23T00:00:00Z',
    });
    const user = userEvent.setup();
    renderPanel();
    await openPanel(user);
    await user.type(screen.getByLabelText('Your question'), 'Why did dividends matter here?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() =>
      expect(
        screen.getByText(/AI explanation is temporarily unavailable/)
      ).toBeInTheDocument()
    );
    // The calm-fallback message renders inside the same aria-live answer
    // region as a real answer would — never inside an alert/error role.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the backend\'s own friendly message directly for a rate-limit error (per-minute or daily, whichever the backend sent)', async () => {
    vi.mocked(askFollowUpQuestion).mockRejectedValueOnce(
      new ApiError({
        code: 'RATE_LIMIT_EXCEEDED',
        message: "You've reached today's limit for this. Please come back tomorrow.",
      })
    );
    const user = userEvent.setup();
    renderPanel();
    await openPanel(user);
    await user.type(screen.getByLabelText('Your question'), 'Why did dividends matter here?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() =>
      expect(screen.getByText("You've reached today's limit for this. Please come back tomorrow.")).toBeInTheDocument()
    );
  });

  it('shows the standard mapped error copy for a non-rate-limit failure', async () => {
    vi.mocked(askFollowUpQuestion).mockRejectedValueOnce(
      new ApiError({ code: 'NETWORK_ERROR', message: 'network down' })
    );
    const user = userEvent.setup();
    renderPanel();
    await openPanel(user);
    await user.type(screen.getByLabelText('Your question'), 'Why did dividends matter here?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() =>
      expect(
        screen.getByText("We couldn’t reach the server. Check your connection and try again.")
      ).toBeInTheDocument()
    );
  });

  it('moves focus to the question input when the panel opens', async () => {
    const user = userEvent.setup();
    renderPanel();

    await openPanel(user);

    await waitFor(() => expect(screen.getByLabelText('Your question')).toHaveFocus());
  });
});
