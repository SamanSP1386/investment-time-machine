import type { Metadata } from 'next';
import { ProductShell } from '@/components/shell/product-shell';
import { socialMetadata } from '@/lib/social-metadata';

const PAGE_TITLE = 'About — Investment Time Machine';
const PAGE_DESCRIPTION = 'The story behind Investment Time Machine, its principles, and what it is and is not.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION }),
};

/**
 * The Educational Disclaimer / About page named in `docs/frontend_design_system.md`
 * §13 (page 8) — a real, linkable page for the "not a financial advisor"
 * positioning and the standing disclaimer, rather than only ever appearing
 * as a footer line or inside an AI panel. M7 Phase 3D-4, item 8; geometry
 * unified onto the shared shell measure M7 Phase 3D-5, item 1 (prose still
 * caps at `max-w-prose` inside the wider column).
 *
 * The builder's-story section is explicitly, visibly a placeholder — the
 * founder supplies final personal copy later (direct instruction); this
 * ships the structure and a clearly-marked stand-in paragraph, never text
 * dressed up to look finished. The GitHub link (M7 Phase 3D-5, item 3) is
 * real and final. Everything else on this page (the product's principles,
 * the disclaimer) is real, sourced copy: the three-layer model and Worked
 * Example language are pulled directly from `docs/EXPERIENCE_CONSTITUTION.md`
 * §3-4, not invented for this page.
 */
export default function AboutPage() {
  return (
    <ProductShell contentClassName="flex flex-col gap-16 py-16 sm:py-24">
      <section className="flex flex-col gap-6">
        <p className="kicker">About this project</p>
        <h1 className="max-w-4xl font-serif text-[clamp(2rem,2.8vw+1rem,3.25rem)] leading-tight font-medium text-ink-primary">
          What Investment Time Machine is, and why it exists.
        </h1>
        <p className="max-w-prose text-base text-ink-secondary sm:text-lg">
          A deterministic, historical, educational replay of real market data — built to answer one question
          precisely: if you had invested a specific amount, in a specific asset, starting on a specific date, here is
          exactly what would have happened.
        </p>
      </section>

      <section className="flex flex-col gap-4" aria-label="The builder">
        <h2 className="text-sm font-semibold text-ink-primary">The builder</h2>
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-dashed border-border-hairline p-6">
          <p className="kicker text-status-warning">Placeholder — founder to replace with final personal copy</p>
          <p className="max-w-prose text-sm text-ink-secondary">
            Investment Time Machine is a solo, long-term project — built the way it&rsquo;s documented: with an
            explicit record of every engineering decision, why it was made, and what tradeoff it accepted, rather
            than a polished result with its reasoning hidden. This paragraph will become the founder&rsquo;s own
            account of why this project exists and what &ldquo;engineering with receipts&rdquo; means in practice —
            not written by anyone but them.
          </p>
        </div>
        {/* Real and final (not part of the placeholder above) — the
            builder's source-code link, in the same quiet editorial link
            treatment the footer uses (M7 Phase 3D-5, item 3). */}
        <p className="max-w-prose text-sm text-ink-secondary">
          Built by Saman —{' '}
          <a
            href="https://github.com/SamanSP1386"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-primary underline decoration-[var(--color-accent)] underline-offset-4 transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)] hover:text-accent"
          >
            GitHub
          </a>
        </p>
      </section>

      <section className="flex flex-col gap-6" aria-label="Principles">
        <h2 className="text-sm font-semibold text-ink-primary">Principles</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink-primary">Identity</h3>
            <p className="max-w-prose text-[15.5px] leading-relaxed text-ink-secondary">
              This product is a worked-example generator, not a dashboard. Every screen anchors to a specific,
              personal &ldquo;if I had invested&hellip;&rdquo; question — never an abstract portfolio-analytics
              surface.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink-primary">Trust</h3>
            <p className="max-w-prose text-[15.5px] leading-relaxed text-ink-secondary">
              Nothing is asserted without a path to its proof. Every number carries a reachable source, and every
              assumption this product makes on your behalf is stated plainly, never applied silently.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink-primary">Behavior</h3>
            <p className="max-w-prose text-[15.5px] leading-relaxed text-ink-secondary">
              Motion and feedback exist to communicate state, never to entertain. A gain and a loss are narrated,
              colored, and animated identically — this product reports outcomes, it doesn&rsquo;t celebrate them.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border-hairline pt-8" aria-label="Disclaimer">
        <h2 className="kicker">Disclaimer</h2>
        <p className="max-w-prose text-sm text-ink-secondary">
          Investment Time Machine is an educational tool — not financial advice. It replays real historical market
          data deterministically; it never predicts, estimates, or recommends a future outcome. Every simulation
          describes what already happened to a specific historical investment — nothing here is a projection of what
          might happen next, and nothing on this site should be read as a suggestion to buy, sell, or hold anything.
        </p>
      </section>
    </ProductShell>
  );
}
