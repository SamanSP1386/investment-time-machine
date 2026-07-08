import { z } from 'zod';
import { apiRequest } from '../client';
import type { SimulationCreateInput, SimulationResponse } from '@/types/api';

/**
 * Mirrors docs/api_design.md §4's request body exactly (field names match
 * the Founder Specification's vocabulary, not the internal DB column
 * names — see KI-024). investment_amount is validated as a decimal
 * *string*, never coerced to a JS number, to avoid float precision loss
 * before the backend ever sees it.
 */
export const simulationCreateSchema = z.object({
  asset_symbol: z.string().min(1, 'Select an asset'),
  investment_amount: z
    .string()
    .min(1, 'Enter an investment amount')
    .regex(/^\d+(\.\d{1,8})?$/, 'Enter a valid positive amount'),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  include_dividends: z.boolean(),
  adjust_for_inflation: z.boolean(),
}) satisfies z.ZodType<SimulationCreateInput>;

/** POST /api/v1/simulations — docs/api_design.md §4. */
export function createSimulation(input: SimulationCreateInput): Promise<SimulationResponse> {
  return apiRequest<SimulationResponse>({ method: 'POST', url: '/api/v1/simulations', data: input });
}

/**
 * GET /api/v1/simulations/{id} — docs/api_design.md §5. growth_series/
 * disclosed_splits may be empty (KI-021/FD-008, approved for full
 * resolution by Founder Decision 014 but not yet implemented — the Results
 * screen must not assume either is populated). `signal` is threaded through
 * to match the other GET endpoints' cancellation convention (src/lib/api/endpoints/assets.ts).
 */
export function getSimulation(id: string, signal?: AbortSignal): Promise<SimulationResponse> {
  return apiRequest<SimulationResponse>({
    method: 'GET',
    url: `/api/v1/simulations/${encodeURIComponent(id)}`,
    signal,
  });
}
