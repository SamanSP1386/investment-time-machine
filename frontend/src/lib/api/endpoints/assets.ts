import { apiRequest } from '../client';
import type { AssetAvailability, AssetDetail, AssetSearchResult, AssetType } from '@/types/api';

export interface SearchAssetsParams {
  query: string;
  assetType?: AssetType;
  limit?: number;
  offset?: number;
}

/**
 * GET /api/v1/assets — docs/api_design.md §2. An empty result set is a
 * normal 200, not an error. `signal` is threaded through so a live-typing
 * autocomplete (the Simulator's asset search) can cancel a stale in-flight
 * request when the user keeps typing — TanStack Query supplies this
 * automatically to every `queryFn` (see `useAssetSearch`).
 */
export function searchAssets(params: SearchAssetsParams, signal?: AbortSignal): Promise<AssetSearchResult> {
  return apiRequest<AssetSearchResult>({
    method: 'GET',
    url: '/api/v1/assets',
    params: {
      query: params.query,
      asset_type: params.assetType,
      limit: params.limit,
      offset: params.offset,
    },
    signal,
  });
}

/** GET /api/v1/assets/{symbol} — docs/api_design.md §2. */
export function getAssetDetail(symbol: string, signal?: AbortSignal): Promise<AssetDetail> {
  return apiRequest<AssetDetail>({
    method: 'GET',
    url: `/api/v1/assets/${encodeURIComponent(symbol)}`,
    signal,
  });
}

/** GET /api/v1/assets/{symbol}/availability — docs/api_design.md §3. */
export function getAssetAvailability(symbol: string, signal?: AbortSignal): Promise<AssetAvailability> {
  return apiRequest<AssetAvailability>({
    method: 'GET',
    url: `/api/v1/assets/${encodeURIComponent(symbol)}/availability`,
    signal,
  });
}
