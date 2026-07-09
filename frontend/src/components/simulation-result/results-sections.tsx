import { formatCurrency, formatDateRange, formatPercentage } from '@/lib/format';
import type { SimulationResponse } from '@/types/api';

/**
 * Sections 4-7 of the Results Reading Experience (M7 Phase 3B.2) — every
 * one of these exists to support Section 2's sentence, never to compete
 * with it. No cards, no borders, no dashboard grids; a small uppercase
 * kicker label plus generous whitespace is the only structure carrying
 * section identity, matching the editorial reading order the approved
 * redesign specifies (Sections 1-2 live in `opening-sequence-heading.tsx`,
 * the hero this file's sections are read after).
 */

function SectionKicker({ children }: { children: string }) {
  return <p className="figure text-xs font-medium tracking-wide text-ink-muted uppercase">{children}</p>;
}

/** A single supporting fact — label, value, and a reachable source, never a bordered tile (BRAND_CONSTITUTION §5/§9's "every number carries a legible source," without the dashboard-KPI-card chrome M7 Phase 3B.2 explicitly rejects). */
function Fact({ label, value, source }: { label: string; value: string; source: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className="figure text-2xl font-semibold text-ink-primary sm:text-3xl">{value}</dd>
      <details className="text-xs text-ink-muted">
        <summary className="cursor-pointer select-none">Source</summary>
        <p className="figure mt-1 font-mono">{source}</p>
      </details>
    </div>
  );
}

/** Section 4 — Supporting Facts: evidence for the sentence above, never the page's own headline. */
export function SupportingFacts({ sim }: { sim: SimulationResponse }) {
  return (
    <section aria-label="Supporting facts" className="flex flex-col gap-6">
      <SectionKicker>Supporting facts</SectionKicker>
      <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <Fact
          label="Final Value"
          value={sim.final_value !== null ? formatCurrency(sim.final_value) : 'Not available'}
          source="final_value — Simulation Engine output"
        />
        <Fact
          label="Total Return"
          value={sim.total_return_percentage !== null ? formatPercentage(sim.total_return_percentage) : 'Not available'}
          source="((final_value − investment_amount) / investment_amount) × 100"
        />
        <Fact
          label="Annual Return (CAGR)"
          value={sim.cagr_percentage !== null ? formatPercentage(sim.cagr_percentage) : 'Not available'}
          source="(final_value / investment_amount) ^ (1 / years) − 1"
        />
      </dl>
    </section>
  );
}

/**
 * Section 5 — Growth Over Time. `growth_series` is empty on every retrieval
 * today (KI-021 — Founder Decision 014 approved the persistence fix, not
 * yet implemented, scheduled for M7 Phase 3C) — this states that plainly
 * rather than rendering an empty or fabricated chart
 * (EXPERIENCE_CONSTITUTION.md §5/§7: a genuine data gap is a plain fact,
 * never smoothed over, never dressed up as an error the user caused). The
 * final value and return above are already exact; only this particular
 * view of the path getting there is still being built.
 */
export function GrowthOverTime({ sim }: { sim: SimulationResponse }) {
  // eslint-disable-next-line no-restricted-syntax -- array-length comparison, not a DecimalString comparison (ADR-033).
  const hasSeries = sim.growth_series.length > 0;
  return (
    <section aria-label="Growth over time" className="flex flex-col gap-6">
      <SectionKicker>Growth over time</SectionKicker>
      {hasSeries ? (
        <p className="max-w-prose text-sm text-ink-secondary">
          {sim.growth_series.length} data points recorded across the simulated period.
        </p>
      ) : (
        <p className="max-w-prose text-sm text-ink-secondary">
          A day-by-day view of this investment&rsquo;s path isn&rsquo;t available for this simulation yet — the
          Simulation Engine doesn&rsquo;t currently persist the full growth series between creation and later
          retrieval, a known, tracked limitation. The Final Value and Total Return above are already exact and fully
          calculated; only this specific view of how it got there is still being built.
        </p>
      )}
    </section>
  );
}

/** One educational paragraph, personalized to this simulation's own values — never a generic, unanchored explainer. */
function WhyParagraph({ heading, children }: { heading: string; children: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-base font-semibold text-ink-primary">{heading}</h3>
      <p className="max-w-prose text-sm text-ink-secondary">{children}</p>
    </div>
  );
}

/**
 * Section 6 — Why. Three short, plain-English paragraphs, personalized to
 * this exact simulation's own values and choices — never AI-generated, per
 * direct instruction. Price appreciation is always relevant; dividend
 * contribution and inflation adjustment each state what was actually
 * chosen for this simulation, an assumption stated plainly rather than
 * silently applied either way (EXPERIENCE_CONSTITUTION.md §5).
 */
export function WhyExplanation({ sim }: { sim: SimulationResponse }) {
  const priceMoved =
    sim.initial_price !== null && sim.final_price !== null
      ? `${sim.asset_symbol}'s own share price moved from ${formatCurrency(sim.initial_price)} to ${formatCurrency(sim.final_price)} over this period — the single largest driver of this result.`
      : `${sim.asset_symbol}'s own share price moving over this period is the single largest driver of this result.`;

  const dividendText = sim.include_dividends
    ? `Dividends paid along the way were reinvested — purchasing additional shares each time a payment occurred, exactly once per payment — and are included in the value above.`
    : `This simulation did not reinvest dividends. If ${sim.asset_symbol} paid dividends during this period, they are not reflected in the value above.`;

  const inflationText = sim.adjust_for_inflation
    ? sim.inflation_adjusted_final_value !== null
      ? `Adjusted for inflation, this result represents ${formatCurrency(sim.inflation_adjusted_final_value)} in today's purchasing power.`
      : `Inflation adjustment was requested, but the CPI data needed for this period wasn't available — the figures above are shown in nominal, not inflation-adjusted, dollars.`
    : `This result is shown in nominal dollars — it is not adjusted for inflation.`;

  return (
    <section aria-label="Why" className="flex flex-col gap-8">
      <SectionKicker>Why</SectionKicker>
      <div className="flex flex-col gap-6">
        <WhyParagraph heading="Price appreciation">{priceMoved}</WhyParagraph>
        <WhyParagraph heading="Dividend contribution">{dividendText}</WhyParagraph>
        <WhyParagraph heading="Inflation adjustment">{inflationText}</WhyParagraph>
      </div>
    </section>
  );
}

/**
 * Section 7 — The Proof. Collapsed by default; methodology, the exact
 * inputs chosen (formerly a standalone "Simulation Snapshot" card — folded
 * in here as an assumption a user can check, not a headline), calculation
 * version, simulation ID, and created timestamp. Nothing technical appears
 * before the explanation above it.
 */
export function TheProof({ sim }: { sim: SimulationResponse }) {
  return (
    <section aria-label="The proof" className="flex flex-col gap-6">
      <SectionKicker>The proof</SectionKicker>
      <details>
        <summary className="cursor-pointer text-sm font-medium text-ink-primary select-none">
          Methodology, assumptions, and technical details
        </summary>
        <div className="mt-6 flex flex-col gap-8 text-sm text-ink-secondary">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-ink-primary">Methodology</h3>
            <p className="max-w-prose">
              This simulation uses each trading day&rsquo;s actual closing price (<code className="figure font-mono">close_price</code>),
              never an adjusted-close shortcut — every dollar of the result above traces to a real historical event,
              not an estimate. Stock splits are retained for audit context but are not applied as a separate
              adjustment, since the stored price series is already internally consistent across splits.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Assumptions</h3>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Asset</dt>
                <dd className="figure font-mono text-ink-primary">{sim.asset_symbol}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Investment amount</dt>
                <dd className="figure text-ink-primary">{formatCurrency(sim.investment_amount)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Date range</dt>
                <dd className="figure text-ink-primary">{formatDateRange(sim.start_date, sim.end_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Dividends reinvested</dt>
                <dd className="text-ink-primary">{sim.include_dividends ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Adjusted for inflation</dt>
                <dd className="text-ink-primary">{sim.adjust_for_inflation ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Technical details</h3>
            <dl className="figure flex flex-col gap-2 font-mono text-xs">
              <div className="flex flex-col gap-0.5">
                <dt className="text-ink-muted uppercase">Simulation ID</dt>
                <dd>{sim.id}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-ink-muted uppercase">Calculation version</dt>
                <dd>{sim.calculation_version}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-ink-muted uppercase">Created</dt>
                <dd>{sim.created_at}</dd>
              </div>
            </dl>
          </div>
        </div>
      </details>
    </section>
  );
}
