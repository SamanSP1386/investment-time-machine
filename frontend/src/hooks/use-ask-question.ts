import { useMutation } from '@tanstack/react-query';
import { askFollowUpQuestion } from '@/lib/api/endpoints/explanations';

/**
 * Backs the AI panel's "Ask about this result" form (M7 Phase 4). A plain
 * mutation, not a query — no conversation history is ever fetched or
 * persisted across page loads (Founder Decision 003/015): each call is a
 * fresh request/response, and `mutation.data` holds only the most recent
 * answer. Never cached under a query key, so navigating away and back always
 * starts clean, matching the no-backend-chat-storage requirement this panel
 * is scoped to.
 */
export function useAskQuestion(simulationId: string) {
  return useMutation({
    mutationFn: (question: string) => askFollowUpQuestion(simulationId, question),
  });
}
