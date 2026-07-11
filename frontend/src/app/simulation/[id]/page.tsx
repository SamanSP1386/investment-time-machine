import type { Metadata } from 'next';
import { SimulationResultClient } from '@/components/simulation-result/simulation-result-client';
import { getSimulation } from '@/lib/api/endpoints/simulations';
import { formatCurrency } from '@/lib/format';

/**
 * M7 Phase 3D-1 (Craft & Coherence, task A.3) — a real per-simulation title
 * ("If you had invested $X in SYMBOL — Investment Time Machine"), not the
 * generic static title every result previously shared. Best-effort only:
 * this is a second, server-side fetch of the same simulation
 * `SimulationResultClient` also fetches client-side via React Query — a
 * known, deliberate Next.js tradeoff for dynamic metadata (a cheap,
 * anonymous-accessible GET, not worth avoiding at the cost of a static
 * title). Any failure here (not-found, network) falls through to the
 * generic title; it never blocks or duplicates `SimulationResultClient`'s
 * own loading/error UI, which is the actual source of truth for the page.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const sim = await getSimulation(id);
    if (sim.status === 'completed' && sim.final_value !== null) {
      const investedText = formatCurrency(sim.investment_amount);
      return {
        title: `If you had invested ${investedText} in ${sim.asset_symbol} — Investment Time Machine`,
        description: `See what ${investedText} invested in ${sim.asset_symbol} would be worth today, calculated from real historical market data.`,
      };
    }
  } catch {
    // Best-effort — see doc comment above.
  }
  return {
    title: 'Simulation Result — Investment Time Machine',
    description: 'The result of a historical investment simulation, calculated by the Simulation Engine.',
  };
}

/**
 * Server component shell; `SimulationResultClient` is the one client
 * boundary, mirroring the `/simulator` page/client split (ADR from M7
 * Phase 2). `params` is a promise in this Next.js version (App Router
 * Dynamic Segments) — see node_modules/next/dist/docs/01-app/.../dynamic-routes.md.
 *
 * No `Suspense` boundary is needed here: `SimulationResultClient` no longer
 * reads `useSearchParams` now that the opening sequence's one-shot `?new=1`
 * replay marker has been removed (Founder Decision 017) — it previously
 * required one specifically because Next.js requires a `Suspense` boundary
 * around any client component that calls `useSearchParams`
 * (node_modules/next/dist/docs/.../use-search-params.md), or a production
 * build fails outright.
 */
export default async function SimulationResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SimulationResultClient id={id} />;
}
