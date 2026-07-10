import { useQuery } from '@tanstack/react-query';
import { getAssetDetail } from '@/lib/api/endpoints/assets';
import { queryKeys } from '@/lib/query/keys';

/**
 * Backs The Proof's "Data source" provenance line (M7 Phase 3C-3). Enabled
 * only by the caller (The Proof fetches this lazily, once its `<details>`
 * disclosure is actually opened) — a supplementary provenance detail must
 * never delay or complicate the Results page's primary loading state,
 * matching EXPERIENCE_CONSTITUTION.md §5's progressive-disclosure posture.
 * Mirrors `useAssetAvailability`'s GET-query shape (ADR-032's reference
 * pattern).
 */
export function useAssetDetail(symbol: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.assets.detail(symbol),
    queryFn: ({ signal }) => getAssetDetail(symbol, signal),
    enabled,
  });
}
