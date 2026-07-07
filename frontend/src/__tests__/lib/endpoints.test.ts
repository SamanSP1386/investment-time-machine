import { describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.fn().mockResolvedValue({ mocked: true });
vi.mock('@/lib/api/client', () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

const { searchAssets, getAssetDetail, getAssetAvailability } = await import('@/lib/api/endpoints/assets');
const { createSimulation, getSimulation } = await import('@/lib/api/endpoints/simulations');

describe('asset endpoints', () => {
  it('searchAssets calls GET /api/v1/assets with query params', async () => {
    await searchAssets({ query: 'AAPL', limit: 10 });
    expect(apiRequestMock).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/v1/assets',
      params: { query: 'AAPL', asset_type: undefined, limit: 10, offset: undefined },
    });
  });

  it('getAssetDetail URL-encodes the symbol', async () => {
    await getAssetDetail('BRK.B');
    expect(apiRequestMock).toHaveBeenCalledWith({ method: 'GET', url: '/api/v1/assets/BRK.B' });
  });

  it('getAssetAvailability calls the availability sub-route', async () => {
    await getAssetAvailability('AAPL');
    expect(apiRequestMock).toHaveBeenCalledWith({ method: 'GET', url: '/api/v1/assets/AAPL/availability' });
  });
});

describe('simulation endpoints', () => {
  it('createSimulation posts the exact payload shape docs/api_design.md documents', async () => {
    const input = {
      asset_symbol: 'AAPL',
      investment_amount: '1000.00',
      start_date: '2015-01-01',
      end_date: '2025-01-01',
      include_dividends: false,
      adjust_for_inflation: false,
    };
    await createSimulation(input);
    expect(apiRequestMock).toHaveBeenCalledWith({ method: 'POST', url: '/api/v1/simulations', data: input });
  });

  it('getSimulation calls GET /api/v1/simulations/{id}', async () => {
    await getSimulation('sim-123');
    expect(apiRequestMock).toHaveBeenCalledWith({ method: 'GET', url: '/api/v1/simulations/sim-123' });
  });
});
