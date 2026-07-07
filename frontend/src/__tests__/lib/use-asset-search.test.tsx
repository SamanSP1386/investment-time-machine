import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAssetSearch } from '@/hooks/use-asset-search';
import { ApiError } from '@/lib/api/errors';

vi.mock('@/lib/api/endpoints/assets', () => ({
  searchAssets: vi.fn(),
}));

const { searchAssets } = await import('@/lib/api/endpoints/assets');

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useAssetSearch', () => {
  it('does not fire a request until a non-empty query is provided', () => {
    renderHook(() => useAssetSearch({ query: '' }), { wrapper: createWrapper() });
    expect(searchAssets).not.toHaveBeenCalled();
  });

  it('fetches and returns results for a non-empty query, keyed via queryKeys', async () => {
    vi.mocked(searchAssets).mockResolvedValueOnce({
      assets: [{ symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', currency: 'USD' }],
      total: 1,
    });

    const { result } = renderHook(() => useAssetSearch({ query: 'AAPL' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(1);
    expect(searchAssets).toHaveBeenCalledWith({ query: 'AAPL' });
  });

  it('surfaces a thrown ApiError through the query result, per the documented error convention', async () => {
    vi.mocked(searchAssets).mockRejectedValueOnce(
      new ApiError({ code: 'RATE_LIMIT_EXCEEDED', message: 'slow down' })
    );

    const { result } = renderHook(() => useAssetSearch({ query: 'AAPL' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
