import { apiRequest } from '../client';
import type { ExplanationResponse } from '@/types/api';

/**
 * POST /api/v1/simulations/{id}/explanations/questions — the Financial
 * Tutor follow-up endpoint (Founder Specification Part 2.7, M6; wired to the
 * AI panel in M7 Phase 4). No client-supplied simulation data is ever sent —
 * the backend loads the simulation's own already-computed data server-side
 * and builds the prompt from that alone (Founder Decision 003's privacy
 * allowlist). Rate-limited per Founder Decision 015; a 429 surfaces as a
 * normal `ApiError` with `code: 'RATE_LIMIT_EXCEEDED'` and a friendly,
 * window-specific message from the backend.
 */
export function askFollowUpQuestion(simulationId: string, question: string): Promise<ExplanationResponse> {
  return apiRequest<ExplanationResponse>({
    method: 'POST',
    url: `/api/v1/simulations/${encodeURIComponent(simulationId)}/explanations/questions`,
    data: { question },
  });
}
