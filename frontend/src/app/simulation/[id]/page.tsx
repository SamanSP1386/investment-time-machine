import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SimulationResultClient } from '@/components/simulation-result/simulation-result-client';

export const metadata: Metadata = {
  title: 'Simulation Result — Investment Time Machine',
  description: 'The result of a historical investment simulation, calculated by the Simulation Engine.',
};

/**
 * Server component shell; `SimulationResultClient` is the one client
 * boundary, mirroring the `/simulator` page/client split (ADR from M7
 * Phase 2). `params` is a promise in this Next.js version (App Router
 * Dynamic Segments) — see node_modules/next/dist/docs/01-app/.../dynamic-routes.md.
 *
 * `SimulationResultClient` reads `useSearchParams` (the opening sequence's
 * one-shot `?new=1` marker, M7 Phase 3B.1) — Next.js requires a `Suspense`
 * boundary around any client component that does, or a production build
 * fails outright (node_modules/next/dist/docs/.../use-search-params.md).
 */
export default async function SimulationResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <SimulationResultClient id={id} />
    </Suspense>
  );
}
