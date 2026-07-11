'use client';

import { useState, type CSSProperties } from 'react';
import { GrowthChart } from './growth-chart';
import { Disclosure } from '@/components/ui/disclosure';
import { useAssetDetail } from '@/hooks/use-asset-detail';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useScramble } from '@/hooks/use-scramble';
import { useSettleIn } from '@/hooks/use-settle-in';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatDateRange, formatPercentage, isNegativeDecimalString } from '@/lib/format';
import type { SimulationResponse } from '@/types/api';

/**
 * Sections 4-7 of the Results Reading Experience (M7 Phase 3B.2, extended
 * by M7 Phase 3C-3 with the Growth Chart, Why, and The Proof; restyled by
 * M7 Phase 3D — Design Elevation, FD-018/ADR-044) — every one of these
 * exists to support Section 2's sentence, never to compete with it. No
 * cards, no borders, no dashboard grids; a small mono kicker label plus
 * generous whitespace is the only structure carrying section identity,
 * matching the editorial reading order the approved redesign specifies
 * (Sections 1-2 live in `opening-sequence-heading.tsx`, the hero this
 * file's sections are read after). Reading order and content are FD-013
 * and do not move — only the visual language changes this pass, ported
 * from the founder-approved mockup.
 */

function SectionKicker({ children }: { children: string }) {
  return <p className="kicker">{children}</p>;
}

/**
 * A single supporting fact — label, scrambled mono value, and a reachable
 * source, never a bordered tile (BRAND_CONSTITUTION §5/§9's "every number
 * carries a legible source," without the dashboard-KPI-card chrome M7
 * Phase 3B.2 explicitly rejects). `negative` applies FD-018/STEP 3's
 * restrained negative tint to a percentage stat VALUE only — never the
 * hero sentence (opening-sequence-heading.tsx never receives this prop).
 */
function Fact({
  label,
  value,
  source,
  negative,
  scramble,
}: {
  label: string;
  value: string;
  source: string;
  negative?: boolean;
  scramble: { duration: number; delay: number };
}) {
  const reducedMotion = useReducedMotion();
  const { text, glow } = useScramble(value, !reducedMotion, scramble);

  return (
    <div className="flex flex-col gap-1.5">
      <dt className="kicker">{label}</dt>
      <dd
        className={cn(
          'figure scramble-figure text-2xl font-semibold break-words sm:text-3xl',
          negative ? 'text-negative-tint' : 'text-ink-primary'
        )}
        style={{ '--scramble-glow-px': glow ? '16px' : '0px' } as CSSProperties}
      >
        {text}
      </dd>
      <Disclosure className="text-xs text-ink-muted" chevronClassName="h-3 w-3" summary="Source">
        <p className="figure pt-1">{source}</p>
      </Disclosure>
    </div>
  );
}

/** Section 4 — Supporting Facts: evidence for the sentence above, never the page's own headline. */
export function SupportingFacts({ sim }: { sim: SimulationResponse }) {
  const reducedMotion = useReducedMotion();
  const settled = useSettleIn(!reducedMotion);

  const finalValueText = sim.final_value !== null ? formatCurrency(sim.final_value) : 'Not available';
  const totalReturnText =
    sim.total_return_percentage !== null ? formatPercentage(sim.total_return_percentage) : 'Not available';
  const cagrText = sim.cagr_percentage !== null ? formatPercentage(sim.cagr_percentage) : 'Not available';

  return (
    <section
      aria-label="Supporting facts"
      className={cn(
        'flex flex-col gap-6 border-t border-b border-border-hairline py-8 transition duration-[var(--duration-transition)] ease-in',
        settled ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <Fact
          label="Final Value"
          value={finalValueText}
          source="final_value — Simulation Engine output"
          scramble={{ duration: 450, delay: 0 }}
        />
        <Fact
          label="Total Return"
          value={totalReturnText}
          source="((final_value − investment_amount) / investment_amount) × 100"
          negative={sim.total_return_percentage !== null && isNegativeDecimalString(sim.total_return_percentage)}
          scramble={{ duration: 450, delay: 100 }}
        />
        <Fact
          label="Annual Return (CAGR)"
          value={cagrText}
          source="(final_value / investment_amount) ^ (1 / years) − 1"
          negative={sim.cagr_percentage !== null && isNegativeDecimalString(sim.cagr_percentage)}
          scramble={{ duration: 450, delay: 200 }}
        />
      </dl>
    </section>
  );
}

/**
 * Section 5 — Growth Over Time. As of Founder Decision 014 (M7 Phase 3C-2,
 * KI-021 resolved), `growth_series` is persisted at creation and read
 * through on every `GET` — reliably populated for a completed simulation.
 * `GrowthChart` (M7 Phase 3C-3, restyled M7 Phase 3D) renders it; this
 * wrapper only supplies the section's kicker/landmark, matching every
 * other section in this file.
 */
export function GrowthOverTime({ sim }: { sim: SimulationResponse }) {
  return (
    <section aria-label="Growth over time" className="flex flex-col gap-6">
      <SectionKicker>Growth over time</SectionKicker>
      <GrowthChart sim={sim} />
    </section>
  );
}

/**
 * One educational paragraph, personalized to this simulation's own values —
 * never a generic, unanchored explainer. M7 Phase 3D-1 (Craft & Coherence,
 * task 11 — accent discipline): the heading is plain ink, not accent —
 * three accent-colored headings on one screen was scarcity-breaking
 * overuse the mockup's own single-hero-figure restraint doesn't license;
 * accent is reserved for hero figures, primary interactive chrome, and key
 * data marks, not a repeated decorative heading treatment.
 */
function WhyParagraph({ heading, children }: { heading: string; children: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink-primary">{heading}</h3>
      <p className="max-w-prose text-[15.5px] leading-relaxed text-ink-secondary">{children}</p>
    </div>
  );
}

/** Section 6's price-appreciation paragraph — always relevant, since price movement drives every simulation regardless of dividend/inflation choices. */
function priceAppreciationText(sim: SimulationResponse): string {
  if (sim.initial_price === null || sim.final_price === null || sim.shares_purchased === null) {
    return `${sim.asset_symbol}'s own share price moving over this period is the single largest driver of this result.`;
  }
  const shares = formatCurrency(sim.shares_purchased, { currencySymbol: '', decimals: 2 });
  return `${sim.asset_symbol}'s own share price moved from ${formatCurrency(sim.initial_price)} to ${formatCurrency(sim.final_price)} over this period, carrying the ${shares} shares this investment purchased to the final value above — the single largest driver of this result.`;
}

/**
 * Section 6's dividend paragraph. Two states, not three: `include_dividends`
 * true (reinvestment was enabled) or false (excluded by the user's own
 * choice). A third state — "the asset paid no dividends at all in this
 * range" — is deliberately not implemented as a distinct branch: nothing in
 * `SimulationResponse` exposes a dividend-event count or flag, and deriving
 * one (e.g. comparing `shares_purchased` against `investment_amount /
 * initial_price`) would require exactly the frontend-side financial
 * arithmetic `src/lib/format/README.md` (ADR-029/033) permanently forbids.
 * Rather than guess, the reinvestment case is phrased to be true whether
 * zero or many dividend events actually occurred ("any dividends... were
 * reinvested") — an honest hedge, not a fabricated certainty. See
 * docs/ARCHITECTURE_DECISIONS.md ADR-043 for the full reasoning.
 */
function dividendText(sim: SimulationResponse): string {
  if (sim.include_dividends) {
    return `Any dividends ${sim.asset_symbol} paid during this period were reinvested automatically — used to purchase additional shares each time a payment occurred — compounding the share count that produced the final value above.`;
  }
  return `This simulation did not reinvest dividends, by choice. If ${sim.asset_symbol} paid dividends during this period, they are not reflected in the value above.`;
}

/**
 * Section 6's inflation paragraph. Three states per direct instruction:
 * adjusted (with a resolved value), adjusted-but-unavailable (a genuine CPI
 * data gap, stated plainly rather than smoothed over —
 * EXPERIENCE_CONSTITUTION.md §5), or not requested at all — in which case
 * this returns `null` and the paragraph is omitted entirely, rather than
 * rendered with filler copy explaining a choice the user already made and
 * already sees reflected in Supporting Facts above.
 */
function inflationText(sim: SimulationResponse): string | null {
  if (!sim.adjust_for_inflation) return null;
  if (sim.inflation_adjusted_final_value !== null) {
    return `Adjusted for inflation, this result represents ${formatCurrency(sim.inflation_adjusted_final_value)} in today's purchasing power — a measure of what the final value could actually buy, not just its face amount.`;
  }
  return `Inflation adjustment was requested, but the CPI data needed for this exact period wasn't available. The figures above are shown in nominal, not inflation-adjusted, dollars — a genuine data gap, stated plainly rather than smoothed over.`;
}

/**
 * Section 6 — Why. Deterministic, template-composed from this exact
 * simulation's own fields — never AI-generated, per direct instruction.
 * Voice: a former quant who now teaches (BRAND_CONSTITUTION.md §2) — calm,
 * precise, no hype. Laid out as the mockup's three-column grid.
 *
 * M7 Phase 3D-1 (Craft & Coherence, task 10): the mono kicker IS the one
 * section-label pattern everywhere else on this page — a second, redundant
 * italic serif "Why?" title directly beneath it was the one place this
 * page said the same thing twice. Dropped, not renamed: the kicker alone
 * already carries the section's identity, exactly like Supporting Facts,
 * Growth Over Time, and The Proof each do with nothing more than their own
 * kicker.
 */
export function WhyExplanation({ sim }: { sim: SimulationResponse }) {
  const reducedMotion = useReducedMotion();
  const settled = useSettleIn(!reducedMotion);
  const inflation = inflationText(sim);

  return (
    <section
      aria-label="Why"
      className={cn(
        'flex flex-col gap-8 transition delay-100 duration-[var(--duration-transition)] ease-in',
        settled ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <SectionKicker>Why</SectionKicker>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <WhyParagraph heading="Price appreciation">{priceAppreciationText(sim)}</WhyParagraph>
        <WhyParagraph heading="Dividend contribution">{dividendText(sim)}</WhyParagraph>
        {inflation !== null ? <WhyParagraph heading="Inflation adjustment">{inflation}</WhyParagraph> : null}
      </div>
    </section>
  );
}

/** Provenance's "Data source" line — fetched lazily, only once the disclosure is actually opened (see `useAssetDetail`'s own doc comment). */
function DataSourceLine({ symbol, enabled }: { symbol: string; enabled: boolean }) {
  const { data, isPending, isError } = useAssetDetail(symbol, enabled);
  const value = !enabled || isPending ? 'Loading…' : isError ? 'Not available' : (data?.data_source ?? 'Not available');
  return (
    <div>
      <dt className="kicker">Data source</dt>
      <dd className="figure text-xs text-ink-primary">{value}</dd>
    </div>
  );
}

/** The accessible, keyboard-navigable text alternative for the Growth Chart — a real `<table>`, not an aria-only summary, matching frontend_design_system.md §8/§11's "every chart ships a table-view fallback." */
function GrowthDataTable({ sim }: { sim: SimulationResponse }) {
  if (sim.growth_series.length === 0) {
    return <p className="text-sm text-ink-secondary">No growth-series data is available for this simulation.</p>;
  }
  return (
    <div className="max-h-80 overflow-y-auto rounded-[var(--radius-sm)] border border-border-hairline">
      <table className="figure w-full text-left text-xs">
        <thead className="sticky top-0 bg-surface">
          <tr>
            <th scope="col" className="kicker border-b border-border-hairline px-3 py-2">
              Date
            </th>
            <th scope="col" className="kicker border-b border-border-hairline px-3 py-2">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {sim.growth_series.map((point) => (
            <tr key={point.point_date}>
              <td className="border-b border-border-hairline px-3 py-1.5 text-ink-secondary">
                {formatDate(point.point_date)}
              </td>
              <td className="border-b border-border-hairline px-3 py-1.5 text-ink-primary">
                {formatCurrency(point.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Section 7 — The Proof. Collapsed by default, never hidden. Methodology
 * (which formulas, the `close_price`-not-`adjusted_close_price` policy, the
 * 365.25-day CAGR convention — sourced from docs/simulation_formulas.md),
 * assumptions (exact-date prices, dividend timing convention, the CPI
 * as-of lookup), provenance (data source, calculation version, simulation
 * ID, created timestamp), and the accessible growth-chart data table. Uses
 * the shared `Disclosure` primitive (M7 Phase 3D-1, task B.8) — a neutral
 * rotating chevron, not the mockup's accent "+" (task 11's accent-scarcity
 * cleanup: a decorative glyph on every disclosure trigger across the page
 * was accent overuse, not a key data mark).
 */
export function TheProof({ sim }: { sim: SimulationResponse }) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const settled = useSettleIn(!reducedMotion);

  return (
    <section
      aria-label="The proof"
      className={cn(
        'flex flex-col gap-6 transition delay-150 duration-[var(--duration-transition)] ease-in',
        settled ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <Disclosure
        className="border-t border-border-hairline pt-7"
        summaryClassName="text-sm font-semibold text-ink-primary"
        onOpenChange={setOpen}
        summary="The Proof — methodology & data"
      >
        <div className="mt-7 flex flex-col gap-8 text-sm text-ink-secondary">
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Methodology</h3>
            <p className="max-w-prose">
              This simulation uses each trading day&rsquo;s actual closing price (
              <code className="figure">close_price</code>), never an adjusted-close shortcut — every dollar of the
              result above traces to a real historical event, not an estimate. When dividends are reinvested, each
              payment purchases additional shares at that day&rsquo;s closing price, compounding on the share count
              already held at that point — not the original starting count. Stock splits are retained for audit
              context but are not applied as a separate share-count adjustment, since the stored price series is
              already internally consistent across splits within the same data fetch.
            </p>
            <p className="max-w-prose">
              Annual return (CAGR) is calculated as{' '}
              <code className="figure text-xs">(final_value / investment_amount) ^ (1 / years) − 1</code>, where{' '}
              <code className="figure text-xs">years</code> uses a fixed 365.25-day-per-year convention (an explicit,
              documented choice — the underlying specification does not mandate a day-count convention, so this one
              is stated rather than left implicit).
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Assumptions</h3>
            <p className="max-w-prose">
              This simulation requires an exact closing price on both the start and end date — a date that falls on
              a weekend or market holiday is never silently shifted to the nearest trading day. Dividends are
              counted once each, on their ex-dividend date, in the order they occurred. When inflation adjustment is
              requested, the calculation uses the most recent CPI reading on or before each date needed — never an
              interpolated value between two real readings.
            </p>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="kicker">Asset</dt>
                <dd className="figure text-ink-primary">{sim.asset_symbol}</dd>
              </div>
              <div>
                <dt className="kicker">Investment amount</dt>
                <dd className="figure text-ink-primary">{formatCurrency(sim.investment_amount)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="kicker">Date range</dt>
                <dd className="figure text-ink-primary">{formatDateRange(sim.start_date, sim.end_date)}</dd>
              </div>
              <div>
                <dt className="kicker">Dividends reinvested</dt>
                <dd className="text-ink-primary">{sim.include_dividends ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="kicker">Adjusted for inflation</dt>
                <dd className="text-ink-primary">{sim.adjust_for_inflation ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Provenance</h3>
            <dl className="figure flex flex-col gap-3 text-xs">
              <DataSourceLine symbol={sim.asset_symbol} enabled={open} />
              <div className="flex flex-col gap-0.5">
                <dt className="kicker">Calculation version</dt>
                <dd>{sim.calculation_version}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="kicker">Simulation ID</dt>
                <dd>{sim.id}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="kicker">Created</dt>
                <dd>{sim.created_at}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Growth chart data</h3>
            <p className="max-w-prose text-xs text-ink-muted">
              The exact date and value behind every point on the growth chart above — the chart&rsquo;s text
              alternative, not only a visual aid.
            </p>
            <GrowthDataTable sim={sim} />
          </div>
        </div>
      </Disclosure>
    </section>
  );
}
