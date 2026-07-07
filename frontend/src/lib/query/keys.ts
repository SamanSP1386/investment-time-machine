import type { SearchAssetsParams } from '@/lib/api/endpoints/assets';

/**
 * The single query-key factory every hook must go through — see
 * src/lib/query/README.md for the full convention. Centralizing this now
 * means M7 Phase 2's screens invalidate/refetch consistently instead of
 * each page inventing its own key shape ad hoc.
 */
export const queryKeys = {
  assets: {
    all: ['assets'] as const,
    search: (params: SearchAssetsParams) => ['assets', 'search', params] as const,
    detail: (symbol: string) => ['assets', 'detail', symbol] as const,
    availability: (symbol: string) => ['assets', 'availability', symbol] as const,
  },
  simulations: {
    all: ['simulations'] as const,
    detail: (id: string) => ['simulations', 'detail', id] as const,
  },
} as const;
