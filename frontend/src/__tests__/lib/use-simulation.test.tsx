import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateSimulation, useSimulation } from '@/hooks/use-simulation';
import { ApiError } from '@/lib/api/errors';

vi.mock('@/lib/api/endpoints/simulations', () => ({
  createSimulation: vi.fn(),
  getSimulation: vi.fn(),
}));

const { createSimulation, getSimulation } = await import('@/lib/api/endpoints/simulations');

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const input = {
  asset_symbol: 'AAPL',
  investment_amount: '1000.00',
  start_date: '2015-01-01',
  end_date: '2025-01-01',
  include_dividends: false,
  adjust_for_inflation: false,
};

describe('useCreateSimulation', () => {
  it('calls createSimulation with the form input and returns the response as-is', async () => {
    const response = { id: 'sim-1', status: 'completed', ...input };
    vi.mocked(createSimulation).mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useCreateSimulation(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // TanStack Query's mutationFn receives a second (context) argument it
    // manages internally — only the first argument is this hook's concern.
    expect(vi.mocked(createSimulation).mock.calls[0]?.[0]).toEqual(input);
    expect(result.current.data).toEqual(response);
  });

  it('surfaces a thrown ApiError through the mutation result, per the documented error convention', async () => {
    vi.mocked(createSimulation).mockRejectedValueOnce(
      new ApiError({ code: 'MISSING_HISTORICAL_DATA', message: 'no data' })
    );

    const { result } = renderHook(() => useCreateSimulation(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe('MISSING_HISTORICAL_DATA');
  });
});

describe('useSimulation', () => {
  it('calls getSimulation with the given id and returns the response as-is', async () => {
    const response = { id: 'sim-1', status: 'completed', ...input };
    vi.mocked(getSimulation).mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useSimulation('sim-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(getSimulation).mock.calls[0]?.[0]).toBe('sim-1');
    expect(result.current.data).toEqual(response);
  });

  it('does not fetch when id is empty', () => {
    const callsBefore = vi.mocked(getSimulation).mock.calls.length;
    const { result } = renderHook(() => useSimulation(''), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(vi.mocked(getSimulation).mock.calls.length).toBe(callsBefore);
  });

  it('surfaces a thrown ApiError through the query result', async () => {
    vi.mocked(getSimulation).mockRejectedValueOnce(new ApiError({ code: 'SIMULATION_NOT_FOUND', message: 'no sim' }));

    const { result } = renderHook(() => useSimulation('missing'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe('SIMULATION_NOT_FOUND');
  });
});
