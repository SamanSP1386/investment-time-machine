'use client';

import { useId, useRef, useState, type CSSProperties, type SubmitEvent } from 'react';
import { GrowthChart } from './growth-chart';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { Input } from '@/components/ui/input';
import { useAskQuestion } from '@/hooks/use-ask-question';
import { useAssetDetail } from '@/hooks/use-asset-detail';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useScramble } from '@/hooks/use-scramble';
import { useSettleIn } from '@/hooks/use-settle-in';
import { ApiError, getErrorCopy } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  compareDecimalStrings,
  formatCurrency,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatPercentage,
  isNegativeDecimalString,
} from '@/lib/format';
import type { GrowthSeriesPoint, SimulationResponse } from '@/types/api';

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
  negative,
  scramble,
}: {
  label: string;
  value: string;
  negative?: boolean;
  scramble: { duration: number; delay: number };
}) {
  const reducedMotion = useReducedMotion();
  const { text, glow, cycling } = useScramble(value, !reducedMotion, scramble);
  // FD-018.1 (item 3) — a quieter, constant glow while still cycling (6px),
  // distinct from the brighter post-settle pulse (16px, unchanged).
  const glowPx = glow ? '16px' : cycling ? '6px' : '0px';

  return (
    <div className="flex flex-col gap-1.5">
      <dt className="kicker">{label}</dt>
      <dd
        className={cn(
          'figure scramble-figure text-2xl font-semibold break-words sm:text-3xl',
          negative ? 'text-negative-tint' : 'text-ink-primary'
        )}
        style={{ '--scramble-glow-px': glowPx } as CSSProperties}
      >
        {text}
      </dd>
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
      {/* FD-018.1 (M7 Phase 3D-3, item 3): 600-700ms (was 450ms), <=150ms
          stagger between stats (100ms here, unchanged). Item 4: the
          per-stat "Source" disclosure is removed — the founder found three
          per-stat formula toggles noisy; the same formulas now live once,
          together, in The Proof's Methodology ("How each figure is
          computed") instead of repeated here. */}
      <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <Fact label="Final Value" value={finalValueText} scramble={{ duration: 650, delay: 0 }} />
        <Fact
          label="Total Return"
          value={totalReturnText}
          negative={sim.total_return_percentage !== null && isNegativeDecimalString(sim.total_return_percentage)}
          scramble={{ duration: 650, delay: 100 }}
        />
        <Fact
          label="Annual Return (CAGR)"
          value={cagrText}
          negative={sim.cagr_percentage !== null && isNegativeDecimalString(sim.cagr_percentage)}
          scramble={{ duration: 650, delay: 200 }}
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

/**
 * Section 6's price-appreciation paragraph — always relevant, since price
 * movement drives every simulation regardless of dividend/inflation
 * choices. Rewritten M7 Phase 3D-5 (item 2, human-voice pass): meaning
 * first, the figures as evidence — the old copy recited the numbers
 * ("moved from X to Y, carrying the Z shares...") and left the reader to
 * work out what they meant. Branches on the price's own direction via
 * `compareDecimalStrings` (the general-purpose, string-safe comparator,
 * ADR-033 — a comparison, never a derived figure), so a gain and a loss
 * each get a sentence that actually describes them; the structure and
 * length of both branches are deliberately parallel (FD-013 §6/§7 —
 * identical treatment, no celebration, no softening).
 */
function priceAppreciationText(sim: SimulationResponse): string {
  if (sim.initial_price === null || sim.final_price === null || sim.shares_purchased === null) {
    return `${sim.asset_symbol}'s own share price moving across this window shaped this result more than any other factor — the exact start and end prices simply aren't available for this particular simulation to show here.`;
  }
  const shares = formatCurrency(sim.shares_purchased, { currencySymbol: '', decimals: 2 });
  const initial = formatCurrency(sim.initial_price);
  const final = formatCurrency(sim.final_price);
  const direction = compareDecimalStrings(sim.final_price, sim.initial_price);
  if (direction === 1) {
    return `The engine of this result is the share price itself climbing: one share of ${sim.asset_symbol} went from ${initial} at the start of this window to ${final} at the end, and the ${shares} shares this investment started with rode that rise. More than anything else, that movement is what the final value above reflects.`;
  }
  if (direction === -1) {
    return `The story of this result is a falling share price: one share of ${sim.asset_symbol} was worth ${initial} when this window opened and ${final} when it closed, and the ${shares} shares this investment started with fell with it. More than anything else, that decline is what the final value above reflects.`;
  }
  return `${sim.asset_symbol}'s share price ended this window exactly where it began — ${initial} per share at both ends — so price movement itself neither added to nor subtracted from this result.`;
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
    return `Dividends never left this simulation as cash. Any payment ${sim.asset_symbol} made during this window bought a little more stock the same day it arrived, so the share count could grow on its own — and every later move in the price worked on those extra shares too. That compounding, wherever it occurred, is already inside the final value above.`;
  }
  return `Dividends played no part in this number — this simulation was set not to reinvest them. If ${sim.asset_symbol} paid any during this window, that cash simply isn't counted here; what you see above is the shares alone.`;
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
    return `Face value and buying power are not the same thing. Measured against actual CPI records for these dates, the final value above works out to ${formatCurrency(sim.inflation_adjusted_final_value)} in today's purchasing power — what the money could really buy, not just the number written on it.`;
  }
  return `Inflation adjustment was requested for this simulation, but the CPI records this exact period needs aren't available. The figures above are therefore face-value dollars, not purchasing power — a genuine gap in the data, stated here plainly rather than smoothed over.`;
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

/**
 * Section 6.5 — Key Takeaways (M7 Phase 3D-4, item 7). The founder's
 * "summary/recommendation" concept, reframed with no advice in it anywhere:
 * 3-4 deterministic, template-composed educational observations built ONLY
 * from this simulation's own already-provided fields — never a new
 * financial calculation. `findExtremeGrowthPoints` below SELECTS an
 * existing data point (the series' own highest/lowest recorded value,
 * compared via `compareDecimalStrings` — the general-purpose, string-safe
 * DecimalString comparator, ADR-033) exactly the way `Math.max`/`Math.min`
 * would select an element from an array; it never derives a new number
 * (a percentage, a drawdown magnitude, a duration in years) the API didn't
 * already return. This is a deliberately different, narrower operation than
 * `growth-chart.tsx`'s own `toChartPlotNumber`/`findExtremePoints`, which
 * ADR-043 scopes explicitly to chart-geometry use only — reusing that
 * pair here, outside the chart, would step outside their own disclosed
 * exception, so this section computes its own selection using the
 * general-purpose comparator instead.
 *
 * Every sentence below is checked against two hard rules: never imperative
 * ("you should..." is forbidden — these are observations about what
 * already happened, not instructions) and never predictive (past tense,
 * historical fact only; `outcomeTakeaway` and `horizonTakeaway` each say so
 * explicitly, not just by omission). The section ends with the same
 * standing educational-tool disclaimer line `AppFooter` carries on every
 * page, restated here since a reader may never scroll to the footer.
 */
function findExtremeGrowthPoints(series: GrowthSeriesPoint[]): { high: GrowthSeriesPoint; low: GrowthSeriesPoint } | null {
  if (series.length === 0) return null;
  let high = series[0];
  let low = series[0];
  for (const point of series) {
    if (compareDecimalStrings(point.value, high.value) === 1) high = point;
    if (compareDecimalStrings(point.value, low.value) === -1) low = point;
  }
  return { high, low };
}

function rangeTakeaway(sim: SimulationResponse): string | null {
  // eslint-disable-next-line no-restricted-syntax -- array-length comparison, not a DecimalString comparison (ADR-033).
  if (sim.growth_series.length < 2) return null;
  const extremes = findExtremeGrowthPoints(sim.growth_series);
  if (!extremes) return null;
  const { high, low } = extremes;
  if (high.point_date === low.point_date) return null;
  return `The final number hides a bumpy ride. Along the way, this investment was recorded as low as ${formatCurrency(low.value)} (on ${formatDate(low.point_date)}) and as high as ${formatCurrency(high.value)} (on ${formatDate(high.point_date)}) — swings a single end-of-window figure never shows.`;
}

/**
 * The "largest drawdown endured and recovery" example — phrased entirely in
 * real, selected dollar figures and dates (never a computed drawdown
 * percentage, which the API doesn't return and this frontend must not
 * derive). Requires the low to be a genuine INTERIOR dip — not the first
 * point (a monotonically rising series' own "low" is trivially just its
 * starting price, not a dip to recover from) and not the last (nothing to
 * recover to yet) — so this only fires for an actual "endured, then
 * recovered" trajectory, never every gaining simulation by construction.
 */
function recoveryTakeaway(sim: SimulationResponse): string | null {
  // eslint-disable-next-line no-restricted-syntax -- array-length comparison, not a DecimalString comparison (ADR-033).
  if (sim.growth_series.length < 3 || sim.final_value === null) return null;
  const extremes = findExtremeGrowthPoints(sim.growth_series);
  if (!extremes) return null;
  const { low } = extremes;
  const firstPoint = sim.growth_series[0];
  const lastPoint = sim.growth_series[sim.growth_series.length - 1];
  const isGenuineRecovery =
    low.point_date !== firstPoint.point_date &&
    low.point_date !== lastPoint.point_date &&
    compareDecimalStrings(sim.final_value, low.value) === 1;
  if (!isGenuineRecovery) return null;
  return `There was a point where this looked much worse. On ${formatDate(low.point_date)} the recorded value had fallen to ${formatCurrency(low.value)}; by the time the window closed on ${formatDate(sim.end_date)} it stood at ${formatCurrency(sim.final_value)}. The low point along the way was not the ending.`;
}

function dividendContributionTakeaway(sim: SimulationResponse): string | null {
  if (!sim.include_dividends) return null;
  return `Part of this result was earned quietly. With reinvestment on, every dividend ${sim.asset_symbol} paid bought more shares the day it arrived — growth that never appears as its own line item, only inside the final value.`;
}

function splitTakeaway(sim: SimulationResponse): string | null {
  if (sim.disclosed_splits.length === 0) return null;
  // eslint-disable-next-line no-restricted-syntax -- array-length comparison, not a DecimalString comparison (ADR-033).
  const plural = sim.disclosed_splits.length > 1;
  return `${sim.disclosed_splits.length} stock split${plural ? 's' : ''} happened during this window (disclosed above). A split changes how many shares exist and what each one costs — it never changed what this investment was worth.`;
}

/** Always available (dates only, no derived duration) — the "time-in-market" example from the section's own brief, explicitly non-predictive. */
function horizonTakeaway(sim: SimulationResponse): string {
  return `This result took the whole window to happen: one continuous holding from ${formatDate(sim.start_date)} to ${formatDate(sim.end_date)}, never traded in between. It says nothing about any other stretch of time — and nothing about the next one.`;
}

/** Always available when a result exists — the general "one specific history, not a rule" observation, guaranteeing at least 3 takeaways even for a degenerate (single-point or empty) growth series. */
function outcomeTakeaway(sim: SimulationResponse): string | null {
  if (sim.final_value === null) return null;
  return `This is what ${sim.asset_symbol} did across one specific stretch of its own history. Start or end the window somewhere else and the same asset's real past can tell a very different story — one simulation is one record, not a rule.`;
}

/**
 * Fixed priority order, first four that apply — deterministic for identical
 * inputs (Founder Decision 013 §6's determinism principle, extended here to
 * generated text, not just motion/timing).
 */
function buildKeyTakeaways(sim: SimulationResponse): string[] {
  const candidates = [
    horizonTakeaway(sim),
    rangeTakeaway(sim),
    recoveryTakeaway(sim),
    dividendContributionTakeaway(sim),
    splitTakeaway(sim),
    outcomeTakeaway(sim),
  ];
  return candidates.filter((takeaway): takeaway is string => takeaway !== null).slice(0, 4);
}

export function KeyTakeaways({ sim }: { sim: SimulationResponse }) {
  const reducedMotion = useReducedMotion();
  const settled = useSettleIn(!reducedMotion);
  const takeaways = buildKeyTakeaways(sim);

  if (takeaways.length === 0) return null;

  return (
    <section
      aria-label="Key takeaways"
      className={cn(
        'flex flex-col gap-6 transition delay-100 duration-[var(--duration-transition)] ease-in',
        settled ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <SectionKicker>Key takeaways</SectionKicker>
      <ul className="flex max-w-prose flex-col gap-3 text-[15.5px] leading-relaxed text-ink-secondary">
        {takeaways.map((takeaway) => (
          <li key={takeaway} className="flex gap-2">
            <span aria-hidden className="text-ink-muted">
              —
            </span>
            <span>{takeaway}</span>
          </li>
        ))}
      </ul>
      <p className="max-w-prose text-xs text-ink-muted">
        Investment Time Machine is an educational tool — not financial advice.
      </p>
    </section>
  );
}

/** Provenance's "Data source" line — fetched lazily, only once the disclosure is actually opened (see `useAssetDetail`'s own doc comment). */
function DataSourceLine({ symbol, enabled }: { symbol: string; enabled: boolean }) {
  const { data, isPending, isError } = useAssetDetail(symbol, enabled);
  const value = !enabled || isPending ? 'Loading…' : isError ? 'Not available' : (data?.data_source ?? 'Not available');
  return (
    <div className="flex flex-col gap-0.5">
      <dt>Data source</dt>
      <dd>{value}</dd>
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
 * "In plain terms" (M7 Phase 3D-3, item 5a) — 3-4 short, non-technical
 * bullets: what data was used, how dividends/inflation were handled, and
 * what was deliberately NOT done. Personalized to this simulation's own
 * choices (not a generic disclaimer block), read before Methodology's
 * denser prose — a non-technical reader can stop here and already
 * understand the result; Methodology is for a reader who wants more.
 */
function plainTermsBullets(sim: SimulationResponse): string[] {
  const dividendsBullet = sim.include_dividends
    ? 'Dividends went straight back in: each payment bought more shares the day it arrived, which is how the share count — and the result — compounded.'
    : `Dividends stayed out of this one, per this simulation's own settings. If ${sim.asset_symbol} paid any, that cash is not in the number above.`;
  // Three inflation states, not two (M7 Phase 3D-5, item 2): the old bullet
  // claimed the result "was adjusted" whenever adjustment was *requested*,
  // even when the CPI lookup came back unavailable and the figures were
  // actually nominal — the one place this list could quietly misstate what
  // happened. The unavailable case now says so, matching `inflationText`.
  const inflationBullet = !sim.adjust_for_inflation
    ? 'No inflation adjustment was applied — the figures above are the dollar amounts as they stood, with no translation into today\'s buying power.'
    : sim.inflation_adjusted_final_value !== null
      ? 'The result was also translated into today\'s purchasing power, using actual historical CPI records — what the money could really buy, not just its face amount.'
      : 'An inflation adjustment was requested, but the CPI records for this exact period aren\'t available — so the figures above are face-value dollars, and that gap is stated rather than hidden.';
  return [
    `Everything above was replayed from ${sim.asset_symbol}'s real daily closing prices between ${formatDate(sim.start_date)} and ${formatDate(sim.end_date)} — recorded market history, with nothing estimated, modeled, or predicted.`,
    dividendsBullet,
    inflationBullet,
    'And what this is not: a prediction. Taxes, fees, and brokerage costs aren\'t modeled; chosen dates are never quietly shifted to a nearby trading day; and nothing here says what happens next.',
  ];
}

function PlainTermsList({ sim }: { sim: SimulationResponse }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-ink-primary">In plain terms</h3>
      {/* No max-w-prose here (M7 Phase 3D-6 clipping-bug fix) — see TheProof's
          own doc comment for why this section's prose runs the panel's full
          measure rather than the AI/Tutor 65-75ch cap. */}
      <ul className="flex flex-col gap-2 text-sm text-ink-secondary">
        {plainTermsBullets(sim).map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span aria-hidden className="text-ink-muted">
              —
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "How each figure is computed" (item 4/5b) — the three formulas that
 * previously lived behind a "Source" disclosure under each individual
 * Supporting Fact (removed, item 4: the founder found three per-stat
 * toggles noisy). Stated once, together, here instead.
 */
function FormulaList() {
  return (
    <dl className="figure flex flex-col gap-2 text-xs text-ink-secondary">
      <div className="flex flex-col gap-0.5">
        <dt className="text-ink-primary">Final Value</dt>
        <dd>The Simulation Engine&rsquo;s own calculated output — not derived from any other figure on this page.</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-ink-primary">Total Return</dt>
        <dd>((final_value − investment_amount) / investment_amount) × 100</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-ink-primary">Annual Return (CAGR)</dt>
        <dd>(final_value / investment_amount) ^ (1 / years) − 1</dd>
      </div>
    </dl>
  );
}

/**
 * Section 7 — The Proof. Collapsed by default, never hidden. Restructured
 * M7 Phase 3D-3 (item 5) after founder review: "In plain terms" leads
 * (§5a), then a tightened Methodology carrying the formula list moved here
 * from the now-removed per-stat Source disclosures (§5b), Assumptions
 * (§5c, tightened), a visually quiet Technical Record (§5d — simulation
 * ID, calculation version, data source, created timestamp; "Created" now
 * runs through `formatDateTime`, fixing a regression where it rendered
 * `sim.created_at` raw/unformatted), and the accessible growth-chart data
 * table (§5e, unchanged). Uses the shared `Disclosure` primitive (M7 Phase
 * 3D-1, task B.8) — a neutral rotating chevron, not the mockup's accent
 * "+" (task 11's accent-scarcity cleanup).
 *
 * M7 Phase 3D-6 (final touch pass, text-clipping fix): none of this
 * section's prose is capped with max-w-prose any more. It was carried over
 * from the per-stat "Source" disclosures this restructure (§5b) replaced,
 * but frontend_design_system.md §5's 65-75ch measure is scoped explicitly
 * to "AI explanation and Financial Tutor text" — long-form narrative prose
 * read on its own. This panel is reference/evidence content (Methodology,
 * Assumptions, the data table), read alongside full-width dl/table
 * siblings in the same single column; capping only the paragraphs produced
 * a real, reproducible ragged-width defect (a ~700px paragraph directly
 * above or below an ~1150px grid/table in the same block) — this is what
 * the founder was seeing as "text not aligned with the full page." Every
 * element in this disclosure now shares one measure. The simulation-ID
 * value below also gained break-all for the same investigation — an
 * unbroken UUID had no wrap protection and could overflow its container at
 * narrow widths, clipped by .itm-elevated's page-level overflow: clip
 * (product-shell.tsx).
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
          <PlainTermsList sim={sim} />

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Methodology</h3>
            <p>
              Uses each day&rsquo;s closing price (<code className="figure">close_price</code>), never adjusted-close.
              Dividends reinvest at that day&rsquo;s close, compounding shares held. Splits are disclosed but not
              adjusted for — the price series is already split-consistent. CAGR uses a fixed 365.25-day year — a
              documented choice, since the specification is silent.
            </p>
            <p className="text-xs text-ink-muted">How each figure is computed:</p>
            <FormulaList />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Assumptions</h3>
            <p>
              An exact closing price is required on the start and end date — a weekend or holiday is never shifted.
              Dividends are counted once, on their ex-dividend date, in order. Inflation adjustment (when requested)
              uses the most recent CPI reading on or before each date — never interpolated.
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

          {/* §5d — a visually quieter sub-block (smaller text, muted color)
              than the sections above: this is a record for support/audit
              reference, not something a reader needs to read to understand
              their result. */}
          <div className="flex flex-col gap-3 border-t border-border-hairline pt-6">
            <h3 className="kicker">Technical record</h3>
            <dl className="figure flex flex-col gap-2.5 text-xs text-ink-muted">
              <DataSourceLine symbol={sim.asset_symbol} enabled={open} />
              <div className="flex flex-col gap-0.5">
                <dt>Calculation version</dt>
                <dd className="break-all">{sim.calculation_version}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt>Simulation ID</dt>
                <dd className="break-all">{sim.id}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt>Created</dt>
                <dd>{formatDateTime(sim.created_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-ink-primary">Growth chart data</h3>
            <p className="text-xs text-ink-muted">
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

/**
 * Section 8 — Ask About This Result (M7 Phase 4, Founder Decision 015).
 * Educational AI panel: anonymous, unauthenticated, rate-limit-protected —
 * never access-gated (Founder Decision 004 decisions 6-7). Wired to the
 * existing Financial Tutor follow-up endpoint (`POST
 * /simulations/{id}/explanations/questions`, Founder Decision 003), which
 * already enforces every hard guardrail this panel depends on: the AI only
 * explains this simulation's own already-computed data, never performs a
 * new calculation, never discusses another asset, never gives advice, and
 * every response is checked for advice-like language before it can ever
 * reach here (`app.ai.safety`). No question or answer is ever persisted
 * across a page load — each submit is a fresh, independent request
 * (`useAskQuestion`), matching Founder Decision 003's "no long-term memory"
 * rule exactly.
 *
 * Collapsed by default via the shared `Disclosure` primitive, positioned
 * directly after The Proof — the same subordinate, quiet posture every
 * other supplementary section on this page already uses
 * (docs/EXPERIENCE_CONSTITUTION.md §5: "An AI panel that competes visually
 * with a calculated result... has broken Trust at the experience layer even
 * if the underlying calculation is untouched"). A `generation_status:
 * 'failed'` response (AI unconfigured, provider outage, or a rejected/unsafe
 * generation) is a normal, successful backend response, not an error
 * (Founder Decision 003) — rendered with the exact same calm, neutral
 * treatment as a completed answer, never red/error styling
 * (docs/frontend_design_system.md's own explicit warning about this).
 */
const SUGGESTED_QUESTIONS = [
  'Why did dividends matter here?',
  'What does CAGR mean?',
  'What does inflation adjustment do to this number?',
];

/** Plain-text paragraph rendering only — AI output is untrusted display content, never parsed as HTML (schemas/explanations.py's own explicit rule). */
function AnswerText({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    // eslint-disable-next-line no-restricted-syntax -- string length comparison, not a DecimalString comparison (ADR-033).
    .filter((paragraph) => paragraph.trim().length > 0);
  return (
    <div className="flex max-w-[70ch] flex-col gap-3 text-[15.5px] leading-relaxed text-ink-secondary">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

export function AskAboutThisResult({ sim }: { sim: SimulationResponse }) {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const reducedMotion = useReducedMotion();
  const settled = useSettleIn(!reducedMotion);
  const mutation = useAskQuestion(sim.id);

  function handleOpenChange(open: boolean) {
    if (open) {
      // Land a keyboard/screen-reader user on the input as soon as the
      // panel reveals, rather than an otherwise-empty newly-visible section
      // (docs/frontend_design_system.md §11 keyboard-operability rule).
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleSuggestedClick(suggested: string) {
    setQuestion(suggested);
    inputRef.current?.focus();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length === 0 || mutation.isPending) return;
    mutation.mutate(trimmed);
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : null;
  const rateLimited = apiError?.code === 'RATE_LIMIT_EXCEEDED';
  const otherErrorCopy = apiError && !rateLimited ? getErrorCopy(apiError.code) : null;

  const result = mutation.data;
  const unavailable = result?.generation_status === 'failed';
  const answerText =
    result?.generation_status === 'completed' ? result.explanation_text : unavailable ? result.error_message : null;

  return (
    <section
      aria-label="Ask about this result"
      className={cn(
        'flex flex-col gap-6 border-t border-border-hairline pt-7 transition delay-200 duration-[var(--duration-transition)] ease-in',
        settled ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <Disclosure
        summaryClassName="text-sm font-semibold text-ink-primary"
        onOpenChange={handleOpenChange}
        summary="Ask about this result"
      >
        <div className="mt-7 flex flex-col gap-5">
          <p className="max-w-prose text-sm text-ink-secondary">
            Ask a question about this simulation&rsquo;s own numbers above — CAGR, dividends, inflation adjustment,
            or anything else already shown. This assistant explains what&rsquo;s already been calculated here; it
            never performs new calculations, discusses other assets, or gives financial advice.
          </p>

          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((suggested) => (
              <button
                key={suggested}
                type="button"
                onClick={() => handleSuggestedClick(suggested)}
                className="target-brackets rounded-full border border-border-hairline px-3 py-1.5 text-xs text-ink-secondary transition-colors duration-150 ease-out hover:border-ink-muted hover:text-ink-primary focus-visible:border-ink-muted focus-visible:text-ink-primary"
              >
                {suggested}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                ref={inputRef}
                id={inputId}
                label="Your question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={500}
                placeholder="e.g. Why did dividends matter here?"
              />
            </div>
            <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={question.trim().length === 0}>
              Ask
            </Button>
          </form>

          <div aria-live="polite" className="flex flex-col gap-3">
            {rateLimited ? <p className="text-sm text-ink-secondary">{apiError.message}</p> : null}
            {otherErrorCopy ? <p className="text-sm text-ink-secondary">{otherErrorCopy.description}</p> : null}
            {answerText ? <AnswerText text={answerText} /> : null}
          </div>
        </div>
      </Disclosure>
    </section>
  );
}
