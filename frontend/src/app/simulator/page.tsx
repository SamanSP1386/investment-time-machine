import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { ProductShell } from '@/components/shell/product-shell';
import { SimulationForm } from '@/components/simulator/simulation-form';

export const metadata: Metadata = {
  title: 'Simulator — Investment Time Machine',
  description: 'Simulate a historical investment decision against real historical market data.',
};

/**
 * Understated, factual — never a marketing badge (BRAND_CONSTITUTION §7's
 * "AI misuse" rule extends naturally here: no saturated color, no
 * celebratory styling, plain sentence-case text per §10). Not a claim about
 * a feature the page doesn't have; each restates something already true of
 * the Simulation Engine and this screen specifically.
 */
const TRUST_INDICATORS = [
  'Deterministic simulation',
  'Historical market data',
  'No predictions',
  'Educational platform',
];

/**
 * The Simulator — a decision screen, generously spaced (BRAND_CONSTITUTION
 * §4/§9). Server component shell; `SimulationForm` is the one client
 * boundary, mirroring the app/dev/playground page/client split.
 */
export default function SimulatorPage() {
  return (
    <ProductShell contentClassName="max-w-[860px] flex flex-col gap-14 px-6 py-20 sm:px-10 sm:py-28">
      <div className="flex flex-col gap-8">
        {/* "Historical simulation," not the product wordmark — AppHeader
            already carries brand identity on every product route. */}
        <p className="kicker">Historical simulation</p>
        <h1 className="font-serif text-[clamp(2rem,2.8vw+1rem,3.25rem)] leading-tight font-medium text-ink-primary">
          Run a historical simulation.
        </h1>
        <p className="max-w-prose text-sm text-ink-secondary">
          Choose an asset, an amount, and a date range. Every result comes directly from the Simulation Engine — this
          page never estimates or calculates on its own.
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted" aria-label="Platform principles">
          {TRUST_INDICATORS.map((label) => (
            <li key={label} className="flex items-center gap-1.5">
              <Check aria-hidden className="h-3 w-3" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <SimulationForm />
    </ProductShell>
  );
}
