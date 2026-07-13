import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductShell } from '@/components/shell/product-shell';
import { TypedHeroHeading } from '@/components/landing/typed-hero-heading';
import { ExampleSimulationsList } from '@/components/landing/example-simulations-list';
import { buttonVariants } from '@/components/ui/button-variants';

export const metadata: Metadata = {
  title: 'Investment Time Machine — What would it be worth today?',
  description:
    'A deterministic historical investment simulator. Real market data, replayed dividend by dividend — never a prediction, never advice.',
};

/**
 * The Landing page (M7 Phase 4 — replaces the M7 Phase 1 foundation-check
 * placeholder tracked in `docs/KNOWN_ISSUES.md`). One viewport at rest on a
 * typical desktop height, same atmosphere/header/footer/tokens as every
 * other product route (`ProductShell`, `.itm-elevated`) — this page is the
 * product's front door, not a separate marketing site with its own visual
 * language.
 *
 * Structure mirrors the Experience Constitution's own three felt stages
 * (`docs/EXPERIENCE_CONSTITUTION.md` §2): the hero poses the product's one
 * real question (ask), the example list offers three real, already-computed
 * answers to start from (see), and every example resolves to a full
 * Simulator → Results loop (understand). Nothing here is a dashboard or a
 * feature-tour — one hero, one CTA, one list of worked examples.
 */
export default function LandingPage() {
  return (
    <ProductShell contentClassName="max-w-[860px] flex flex-col gap-10 px-6 py-12 sm:px-10 sm:py-16">
      <section className="flex flex-col gap-6">
        <TypedHeroHeading />
        <p className="max-w-prose text-base text-ink-secondary sm:text-lg">
          A deterministic, historical, educational replay of real market data — never a projection, never advice.
        </p>
        <div>
          <Link href="/simulator" className={buttonVariants({ variant: 'primary' })}>
            Run a simulation
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="kicker">Example simulations</p>
        <ExampleSimulationsList />
      </section>
    </ProductShell>
  );
}
