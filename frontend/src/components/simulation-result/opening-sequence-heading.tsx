'use client';

import { type CSSProperties, type ReactNode } from 'react';
import { useAssetDetail } from '@/hooks/use-asset-detail';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useScramble } from '@/hooks/use-scramble';
import { useSettleIn } from '@/hooks/use-settle-in';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import type { SimulationResponse } from '@/types/api';

/**
 * The Results Reading Experience's hero (M7 Phase 3B.2; restyled M7 Phase
 * 3D — Design Elevation, FD-018/ADR-044): the worked-example sentence, "if
 * you had invested X in Y, starting on Z — here's what happened." Every
 * other section on the page (`results-sections.tsx`) is supporting evidence
 * for this sentence, never competing with it — no card, no border, no
 * badge, nothing but typography, whitespace, and rhythm carrying the
 * hierarchy.
 *
 * Renders the sentence and every child section immediately on data arrival
 * (Founder Decision 017) as one flowing serif sentence (matching the
 * approved mockup's "serif display sentence with mono figures" pattern),
 * with the two answer-bearing figures (the invested amount, the final
 * value) set in the mono figure typeface and running FD-018 rule 1's
 * one-shot digits-only scramble/settle. The surrounding prose is never
 * gated behind the scramble — it is present, complete, and in the
 * accessible tree from the very first render (`aria-label` always carries
 * the final, non-scrambling sentence text, independent of what's
 * mid-animation visually). The only other motion is the pre-existing single
 * ~200ms opacity/translate settle on the whole sentence, played once on
 * mount via `useSettleIn`, fully disabled under `prefers-reduced-motion`
 * (Founder Decision 017/ADR-041, unchanged by this pass).
 */

const FIGURE_GLOW_PX = '20px';

function ScrambleFigure({
  value,
  active,
  duration,
  delay,
}: {
  value: string;
  active: boolean;
  duration: number;
  delay: number;
}) {
  const { text, glow } = useScramble(value, active, { duration, delay });
  return (
    <span
      className="figure scramble-figure font-semibold text-accent"
      style={{ '--scramble-glow-px': glow ? FIGURE_GLOW_PX : '0px' } as CSSProperties}
    >
      {text}
    </span>
  );
}

/**
 * Task F.23 (M7 Phase 3D-1) — the hero names the asset by its real display
 * name when one is available ("Apple Inc. (AAPL)"), falling back to the
 * ticker alone the moment it isn't (still loading, request failed, or the
 * asset genuinely has no distinct display name) — never a blocking wait
 * for this specific fetch: `AssetDetail` is not part of `SimulationResponse`
 * itself, so it's fetched here directly (eagerly, unlike The Proof's own
 * lazy `useAssetDetail` call — that one only backs a collapsed disclosure,
 * this one backs the hero sentence itself, which FD-017 renders
 * immediately and unconditionally regardless of this fetch's own state).
 */
function useAssetLabel(symbol: string): string {
  const { data } = useAssetDetail(symbol, true);
  if (data?.name && data.name !== symbol) {
    return `${data.name} (${symbol})`;
  }
  return symbol;
}

export function OpeningSequenceHeading({ sim, children }: { sim: SimulationResponse; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const active = !reducedMotion;
  const settled = useSettleIn(active);
  const assetLabel = useAssetLabel(sim.asset_symbol);

  const investedText = formatCurrency(sim.investment_amount);
  const answerText = sim.final_value !== null ? formatCurrency(sim.final_value) : 'Not available';
  const fullSentenceText = `If you had invested ${investedText} in ${assetLabel} between ${formatDate(sim.start_date)} and ${formatDate(sim.end_date)}, your investment would be worth ${answerText} today.`;
  // Punctuation matches the approved mockup exactly: a comma before "your
  // investment," none after the asset name/ticker.

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/*
         * Section 1 — a very small label. Nothing more. "Simulation
         * result," not the product wordmark — `AppHeader` (M7 Phase 3D-1,
         * task A.1) already carries brand identity on every product route,
         * so repeating it here would be the same kind of redundant
         * eyebrow the Why/Why? duplication fix (task 10) already removed
         * elsewhere on this page.
         */}
        <p className="kicker">Simulation result</p>

        {/*
         * Section 2 — the Worked Example, the page's hero. `aria-label`
         * guarantees a screen reader gets the complete, always-correct
         * sentence regardless of the scrambled digits mid-animation inside
         * it — the visible text and the accessible name are decoupled by
         * design, matching FD-018 rule 1's "the surrounding sentence text
         * renders immediately and is never gated."
         */}
        <h1
          aria-label={fullSentenceText}
          className={cn(
            'max-w-4xl font-serif text-[clamp(2rem,3vw+1rem,3.5rem)] leading-[1.18] font-medium tracking-tight text-ink-primary transition duration-[var(--duration-transition)] ease-in',
            settled ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          )}
        >
          If you had invested{' '}
          <ScrambleFigure value={investedText} active={active} duration={600} delay={0} /> in {assetLabel} between{' '}
          {formatDate(sim.start_date)} and {formatDate(sim.end_date)}, your investment would be worth{' '}
          <ScrambleFigure value={answerText} active={active} duration={600} delay={100} /> today.
        </h1>
      </div>

      {/*
       * Section 3 — whitespace. Nothing renders here; the gap above
       * (`gap-10 sm:gap-14` on the outer column) between the sentence and
       * whatever comes next *is* this section — a pause a reader is
       * allowed to sit in, not a component.
       */}

      <div className="flex flex-col gap-14 sm:gap-20">{children}</div>
    </div>
  );
}
