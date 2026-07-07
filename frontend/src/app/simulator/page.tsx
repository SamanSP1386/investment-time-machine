import type { Metadata } from 'next';
import { SimulationForm } from '@/components/simulator/simulation-form';

export const metadata: Metadata = {
  title: 'Simulator — Investment Time Machine',
  description: 'Simulate a historical investment decision against real historical market data.',
};

/**
 * The Simulator — a decision screen, generously spaced (BRAND_CONSTITUTION
 * §4/§9). Server component shell; `SimulationForm` is the one client
 * boundary, mirroring the app/dev/playground page/client split.
 */
export default function SimulatorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6 sm:p-10">
      <div className="flex flex-col gap-2">
        <p className="figure text-xs font-medium tracking-wide text-ink-muted uppercase">Historical simulation</p>
        {/* A hairline rule under the kicker — the Time Axis motif (BRAND_CONSTITUTION §5), applied structurally, not decoratively. */}
        <div className="h-px w-12 bg-border-gridline" aria-hidden />
        <h1 className="text-2xl font-semibold text-ink-primary sm:text-3xl">Run a historical simulation</h1>
        <p className="max-w-prose text-sm text-ink-secondary">
          Choose an asset, an amount, and a date range. Every result comes directly from the Simulation Engine — this
          page never estimates or calculates on its own.
        </p>
      </div>

      <SimulationForm />
    </main>
  );
}
