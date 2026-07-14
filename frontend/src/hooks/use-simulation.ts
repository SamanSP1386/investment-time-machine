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
 *
 * Also seeds `queryKeys.simulations.detail(sim.id)` directly with the
 * mutation's own response (M7 Phase 3D-4, item 3) — the POST response IS a
 * complete, valid `SimulationResponse`, identical in shape to what
 * `GET /api/v1/simulations/{id}` would return a moment later. Without this,
 * the Simulator's navigation to `/simulation/[id]` triggered a second,
 * redundant fetch of data already in hand, forcing a visible second loading
 * flash (`ResultsSkeleton`) on top of the one the Simulator's own submit
 * interstitial already showed — two stacked loading states for one genuinely
 * in-flight request. Seeding here means the Results page can render
 * immediately from cache; TanStack Query still revalidates in the
 * background per its normal staleness rules, so this is a performance/UX
 * optimization, never a correctness shortcut — a background refetch would
 * still catch a genuine drift.
 */
export function useCreateSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSimulation,
    onSuccess: (sim) => {
      queryClient.setQueryData(queryKeys.simulations.detail(sim.id), sim);
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
