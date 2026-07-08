import type { Metadata } from 'next';
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
 */
export default async function SimulationResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SimulationResultClient id={id} />;
}
