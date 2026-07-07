import { useQuery } from '@tanstack/react-query';
import { searchAssets, type SearchAssetsParams } from '@/lib/api/endpoints/assets';
import { queryKeys } from '@/lib/query/keys';

/**
 * Reference implementation of this project's TanStack Query conventions
 * (src/lib/query/README.md) — cross-cutting infrastructure usable by both
 * the future Simulator (asset autocomplete) and Asset Explorer (search)
 * screens, not page-specific business logic.
 */
export function useAssetSearch(params: SearchAssetsParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.assets.search(params),
    // TanStack Query supplies `signal` to every queryFn automatically —
    // forwarding it lets a stale in-flight search be aborted the moment a
    // newer keystroke supersedes it (A6, docs/PROJECT_STATE.md punch list).
    queryFn: ({ signal }) => searchAssets(params, signal),
    // eslint-disable-next-line no-restricted-syntax -- query.length is a string length, not a DecimalString comparison (ADR-033).
    enabled: options.enabled ?? params.query.length > 0,
  });
}
