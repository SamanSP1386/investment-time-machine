import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAskQuestion } from '@/hooks/use-ask-question';
import { ApiError } from '@/lib/api/errors';

vi.mock('@/lib/api/endpoints/explanations', () => ({
  askFollowUpQuestion: vi.fn(),
}));

const { askFollowUpQuestion } = await import('@/lib/api/endpoints/explanations');

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const COMPLETED_RESPONSE = {
  id: 'exp-1',
  simulation_id: 'sim-1',
  explanation_type: 'follow_up' as const,
  question_text: 'Why did dividends matter here?',
  explanation_text: 'Dividends compounded because reinvestment was enabled.',
  generation_status: 'completed' as const,
  model_name: 'llama-3.1-8b-instant',
  prompt_version: 'v1.0',
  error_message: null,
  created_at: '2026-07-23T00:00:00Z',
};

describe('useAskQuestion', () => {
  it('calls askFollowUpQuestion with the simulation id and question text', async () => {
    vi.mocked(askFollowUpQuestion).mockResolvedValueOnce(COMPLETED_RESPONSE);

    const { result } = renderHook(() => useAskQuestion('sim-1'), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate('Why did dividends matter here?');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(askFollowUpQuestion).toHaveBeenCalledWith('sim-1', 'Why did dividends matter here?');
    expect(result.current.data).toEqual(COMPLETED_RESPONSE);
  });

  it('surfaces a thrown ApiError through the mutation result (e.g. a rate limit)', async () => {
    vi.mocked(askFollowUpQuestion).mockRejectedValueOnce(
      new ApiError({ code: 'RATE_LIMIT_EXCEEDED', message: "You've reached today's limit. Please come back tomorrow." })
    );

    const { result } = renderHook(() => useAskQuestion('sim-1'), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate('Another question');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('never seeds any query cache — each call is a fresh, independent request with no persisted history', async () => {
    vi.mocked(askFollowUpQuestion).mockResolvedValueOnce(COMPLETED_RESPONSE);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useAskQuestion('sim-1'), { wrapper: Wrapper });
    act(() => {
      result.current.mutate('Why did dividends matter here?');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
