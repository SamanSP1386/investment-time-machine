import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { ProductShell } from '@/components/shell/product-shell';
import { SimulationForm } from '@/components/simulator/simulation-form';
import { socialMetadata } from '@/lib/social-metadata';

const PAGE_TITLE = 'Simulator — Investment Time Machine';
const PAGE_DESCRIPTION = 'Simulate a historical investment decision against real historical market data.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION }),
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
    // Vertical rhythm only — the horizontal measure is the shell's own (M7
    // Phase 3D-5, item 1); py aligned to the Results page's 16/24.
    <ProductShell contentClassName="flex flex-col gap-14 py-16 sm:py-24">
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
