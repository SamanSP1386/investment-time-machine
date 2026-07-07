import { useQuery } from '@tanstack/react-query';
import { getAssetAvailability } from '@/lib/api/endpoints/assets';
import { queryKeys } from '@/lib/query/keys';

/**
 * Backs the Simulator's pre-submit date-range check
 * (frontend_design_system.md §13: "date-range pre-validation against GET
 * /assets/{symbol}/availability before submit, so users don't hit
 * MISSING_HISTORICAL_DATA avoidably"). Only enabled once a symbol is
 * actually selected — there is nothing to check before then.
 */
export function useAssetAvailability(symbol: string | null) {
  return useQuery({
    queryKey: queryKeys.assets.availability(symbol ?? ''),
    queryFn: ({ signal }) => getAssetAvailability(symbol as string, signal),
    // eslint-disable-next-line no-restricted-syntax -- symbol.length is a string length, not a DecimalString comparison (ADR-033).
    enabled: symbol !== null && symbol.length > 0,
  });
}
