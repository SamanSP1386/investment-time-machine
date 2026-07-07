import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSimulation } from '@/lib/api/endpoints/simulations';
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
