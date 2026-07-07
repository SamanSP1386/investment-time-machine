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
    queryFn: () => searchAssets(params),
    enabled: options.enabled ?? params.query.length > 0,
  });
}
