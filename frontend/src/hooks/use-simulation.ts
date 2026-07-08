import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSimulation, getSimulation } from '@/lib/api/endpoints/simulations';
import { queryKeys } from '@/lib/query/keys';

/**
 * Wraps `POST /api/v1/simulations` (docs/api_design.md §4) — the Simulator
 * form's only write path. Never computes anything itself; the mutation's
 * `data` is the backend's own `SimulationResponse`, displayed as-is.
 * Invalidates `queryKeys.simulations.all` on success per
 * src/lib/query/README.md's convention (prefix invalidation, not one
 * `.detail(id)` at a time).
 */
export function useCreateSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSimulation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simulations.all });
    },
  });
}

/**
 * Backs the Results screen (`/simulation/[id]`) — `GET
 * /api/v1/simulations/{id}` (docs/api_design.md §5). Never computes
 * anything itself; `data` is the backend's own `SimulationResponse`,
 * displayed as-is. Mirrors `useAssetAvailability`'s GET-query shape
 * (ADR-032's reference pattern), enabled only once a real `id` is known.
 */
export function useSimulation(id: string) {
  return useQuery({
    queryKey: queryKeys.simulations.detail(id),
    queryFn: ({ signal }) => getSimulation(id, signal),
    // eslint-disable-next-line no-restricted-syntax -- id.length is a string length, not a DecimalString comparison (ADR-033).
    enabled: id.length > 0,
  });
}
