import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAssetAvailability } from '@/hooks/use-asset-availability';

vi.mock('@/lib/api/endpoints/assets', () => ({
  getAssetAvailability: vi.fn(),
}));

const { getAssetAvailability } = await import('@/lib/api/endpoints/assets');

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useAssetAvailability', () => {
  it('does not fire a request when no symbol is selected', () => {
    renderHook(() => useAssetAvailability(null), { wrapper: createWrapper() });
    expect(getAssetAvailability).not.toHaveBeenCalled();
  });

  it('fetches availability once a symbol is selected', async () => {
    vi.mocked(getAssetAvailability).mockResolvedValueOnce({
      symbol: 'AAPL',
      earliest_date: '1980-12-12',
      latest_date: '2026-07-01',
      data_source: 'yfinance',
    });

    const { result } = renderHook(() => useAssetAvailability('AAPL'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.earliest_date).toBe('1980-12-12');
    expect(getAssetAvailability).toHaveBeenCalledWith('AAPL', expect.any(AbortSignal));
  });
});
