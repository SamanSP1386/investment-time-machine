'use client';

import { type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettleIn } from '@/hooks/use-settle-in';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import type { SimulationResponse } from '@/types/api';

/**
 * The Results Reading Experience's hero (M7 Phase 3B.2): the worked-example
 * sentence, "if you had invested X in Y, starting on Z — here's what
 * happened." Every other section on the page (`results-sections.tsx`) is
 * supporting evidence for this sentence, never competing with it — no card,
 * no border, no badge, no color, nothing but typography, whitespace, and
 * rhythm carrying the hierarchy.
 *
 * Renders the sentence and every child section immediately on data arrival
 * (Founder Decision 017, superseding the M7 Phase 3B.1 staged
 * composing→pause→reveal timeline this component originally implemented —
 * see `docs/ARCHITECTURE_DECISIONS.md` ADR-041). The only motion permitted
 * is a single ~200ms opacity/translate settle on the sentence itself,
 * played once on mount via `useSettleIn`, fully disabled under
 * `prefers-reduced-motion`. No composing phase, no pause, no reveal
 * choreography, no skip affordance — there is nothing to skip.
 */

interface SentenceLine {
  text: string;
  /** The two figures the sentence exists to report — rendered at the large "Hero Figure" size (BRAND_CONSTITUTION §6), everything else supports them. */
  emphasize?: boolean;
}

function sentenceLines(sim: SimulationResponse): SentenceLine[] {
  const answerValue = sim.final_value !== null ? formatCurrency(sim.final_value) : 'Not available';
  return [
    { text: 'If you had invested' },
    { text: formatCurrency(sim.investment_amount), emphasize: true },
    { text: `in ${sim.asset_symbol}` },
    { text: `between ${formatDate(sim.start_date)}` },
    { text: `and ${formatDate(sim.end_date)}` },
    { text: 'your investment would be worth' },
    { text: `${answerValue} today.`, emphasize: true },
  ];
}

const LINE_SIZE = 'text-2xl font-medium text-ink-primary sm:text-3xl';
const FIGURE_SIZE = 'figure text-4xl font-semibold text-ink-primary sm:text-6xl';

export function OpeningSequenceHeading({ sim, children }: { sim: SimulationResponse; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const settled = useSettleIn(!reducedMotion);

  const lines = sentenceLines(sim);
  const fullSentenceText = lines.map((line) => line.text).join(' ');

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Section 1 — a very small label. Nothing more. */}
        <div className="flex flex-col gap-2">
          <p className="figure text-xs font-medium tracking-wide text-ink-muted uppercase">Simulation result</p>
          <div className="h-px w-12 bg-border-gridline" aria-hidden />
        </div>

        {/*
         * Section 2 — the Worked Example, the page's hero. `aria-label`
         * guarantees a screen reader gets the sentence with correct word
         * spacing regardless of how the visual line breaks are marked up;
         * the visible text is identical, present from first paint.
         */}
        <h1
          aria-label={fullSentenceText}
          className={cn(
            'flex flex-col gap-1 sm:gap-2 transition duration-[var(--duration-transition)] ease-in',
            settled ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          )}
        >
          {lines.map((line) => (
            <span key={line.text} className={line.emphasize ? FIGURE_SIZE : LINE_SIZE}>
              {line.text}
            </span>
          ))}
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
