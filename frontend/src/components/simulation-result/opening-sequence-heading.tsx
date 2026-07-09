'use client';

import { Fragment, type ReactNode } from 'react';
import { useJustCreatedFlag } from '@/hooks/use-just-created-flag';
import { useOpeningSequence } from '@/hooks/use-opening-sequence';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import type { SimulationResponse } from '@/types/api';

/**
 * The Results Opening Sequence (M7 Phase 3B.1) feeding the Results Reading
 * Experience's hero (M7 Phase 3B.2). This is not a dashboard heading — it
 * is the page's entire reason to exist: "if you had invested X in Y,
 * starting on Z — here's what happened." Every other section on the page
 * (`docs/... M7 Phase 3B.2 spec's Sections 3-7`) is supporting evidence for
 * this sentence, never competing with it — no card, no border, no badge,
 * no color, nothing but typography, whitespace, and rhythm carrying the
 * hierarchy.
 *
 * Only ever animates for `SimulationForm`'s own `?new=1` navigation
 * (`useJustCreatedFlag`); a refresh, a browser-back, a shared link, or a
 * revisited simulation all render the exact same final sentence
 * immediately, no sequence played (EXPERIENCE_CONSTITUTION.md's replay
 * rules — unchanged from M7 Phase 3B.1, this phase only redesigns what the
 * sentence *looks like*, not when or whether it animates).
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

function SentenceLineEl({ line, visible }: { line: SentenceLine; visible: boolean }) {
  return (
    <p
      className={cn(
        line.emphasize ? FIGURE_SIZE : LINE_SIZE,
        'transition duration-[var(--duration-transition)] ease-[var(--ease-standard)]',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      )}
    >
      {line.text}
    </p>
  );
}

export function OpeningSequenceHeading({ sim, children }: { sim: SimulationResponse; children: ReactNode }) {
  const isJustCreated = useJustCreatedFlag();
  const reducedMotion = useReducedMotion();
  const shouldPlay = isJustCreated && !reducedMotion;

  const lines = sentenceLines(sim);
  // The answer (last line) is gated by `phase`, not by the reveal count —
  // it arrives only after the silent pause, never merely "next in sequence."
  const inputLines = lines.slice(0, -1);
  const answerLine = lines[lines.length - 1];
  const { phase, visiblePhraseCount, skip } = useOpeningSequence(inputLines.length, shouldPlay);

  const settled = phase === 'settled';
  const answerVisible = phase === 'answered' || settled;
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
         * Section 2 — the Worked Example, the page's hero. Present with
         * its final text from the very first render (`aria-label`) so a
         * screen reader gets the whole answer immediately, never only
         * through the decorative, line-by-line reveal below.
         */}
        <h1 aria-label={fullSentenceText} className={cn('flex flex-col gap-1 sm:gap-2', settled ? '' : 'sr-only')}>
          {lines.map((line) => (
            <span key={line.text} className={line.emphasize ? FIGURE_SIZE : LINE_SIZE}>
              {line.text}
            </span>
          ))}
        </h1>

        {!settled ? (
          <>
            {/*
             * Purely visual — the real `<h1>` above already carries the
             * complete, correctly-spaced sentence via `aria-label`, so this
             * reveal is decorative and safely hidden from the
             * accessibility tree. The "Skip" control below is deliberately
             * kept *outside* this `aria-hidden` boundary — it must stay a
             * real, focusable, announced button, never hidden along with
             * the decoration around it (EXPERIENCE_CONSTITUTION.md §9:
             * "never block keyboard users").
             */}
            <div aria-hidden="true" className="flex flex-col gap-1 sm:gap-2">
              {inputLines.map((line, index) => (
                <Fragment key={line.text}>
                  {/* eslint-disable-next-line no-restricted-syntax -- phrase-index comparison, not a DecimalString comparison (ADR-033). */}
                  <SentenceLineEl line={line} visible={index < visiblePhraseCount} />
                </Fragment>
              ))}
              <SentenceLineEl line={answerLine} visible={answerVisible} />
            </div>

            <button
              type="button"
              onClick={skip}
              className="figure self-start text-xs font-medium text-ink-muted underline-offset-4 hover:text-ink-secondary hover:underline"
            >
              Skip
            </button>
          </>
        ) : null}
      </div>

      {/*
       * Section 3 — whitespace. Nothing renders here; the gap above
       * (`gap-10 sm:gap-14` on the outer column) between the sentence and
       * whatever comes next *is* this section — a pause a reader is
       * allowed to sit in, not a component.
       */}

      {settled ? <div className="flex flex-col gap-14 sm:gap-20">{children}</div> : null}
    </div>
  );
}
