import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAssetDetail } from '@/hooks/use-asset-detail';

vi.mock('@/lib/api/endpoints/assets', () => ({
  getAssetDetail: vi.fn(),
}));

const { getAssetDetail } = await import('@/lib/api/endpoints/assets');

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useAssetDetail', () => {
  it('does not fire a request when not enabled — a supplementary provenance detail never fetches eagerly', () => {
    renderHook(() => useAssetDetail('AAPL', false), { wrapper: createWrapper() });
    expect(getAssetDetail).not.toHaveBeenCalled();
  });

  it('fetches the asset detail once enabled', async () => {
    vi.mocked(getAssetDetail).mockResolvedValueOnce({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      asset_type: 'stock',
      currency: 'USD',
      data_source: 'yfinance',
      is_active: true,
      exchange: null,
    });

    const { result } = renderHook(() => useAssetDetail('AAPL', true), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data_source).toBe('yfinance');
    expect(getAssetDetail).toHaveBeenCalledWith('AAPL', expect.any(AbortSignal));
  });
});
