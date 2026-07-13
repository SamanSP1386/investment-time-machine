'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { EXAMPLE_SIMULATIONS } from '@/config/example-simulations';
import { useProximityRows } from '@/hooks/use-proximity-rows';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

function useCoarsePointer(): boolean {
  const [coarse] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(pointer: coarse)').matches
  );
  return coarse;
}

/**
 * The Landing page's proximity-reactive example index (concept adapted from
 * a founder-provided reference, rebuilt in-house — see `use-proximity-rows`).
 * Three real worked examples (`config/example-simulations.ts`, shared with
 * the Simulator's own chips so the two can never drift, closing KI-044's
 * disclosed frontend gap), each a plain, fully keyboard-operable link to
 * `/simulator?example=<id>` — the query param is read once on mount by
 * `SimulationForm` and applied through the exact same `applyPreset`
 * mechanism the Simulator's chips already use.
 *
 * On desktop with motion allowed, pointer proximity nudges the label,
 * scales the hairline marker, and mixes its color toward accent
 * (`useProximityRows`). Touch and `prefers-reduced-motion` both disable the
 * hook outright (no listeners attached, no rAF ever scheduled) — the same
 * markup then reads as a plain, fully functional list of links styled by
 * ordinary CSS `:hover`/`:focus-visible`, never a degraded experience.
 */
export function ExampleSimulationsList() {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const enabled = !reducedMotion && !coarsePointer;
  const { containerRef, rowRefs, setTarget } = useProximityRows(EXAMPLE_SIMULATIONS.length, enabled);

  return (
    <div ref={containerRef} className="flex flex-col" aria-label="Example simulations">
      {EXAMPLE_SIMULATIONS.map((example, index) => (
        <Link
          key={example.id}
          href={`/simulator?example=${example.id}`}
          ref={(el) => {
            rowRefs.current[index] = el;
          }}
          onFocus={() => setTarget(index, 1)}
          onBlur={() => setTarget(index, 0)}
          style={{ '--proximity': 0 } as CSSProperties}
          className={cn(
            'group flex items-center gap-5 border-b border-border-hairline py-4 outline-none',
            'transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]',
            'hover:[&_.example-label]:text-ink-primary focus-visible:[&_.example-label]:text-ink-primary'
          )}
        >
          <span aria-hidden className="kicker w-6 shrink-0 text-ink-muted">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            aria-hidden
            className="h-4 w-px shrink-0 origin-center bg-border-hairline-strong transition-transform"
            style={{ transform: 'scaleY(calc(1 + var(--proximity) * 0.8))' }}
          />
          <span
            className="example-label flex-1 text-lg text-ink-secondary transition-[color,transform] duration-150 ease-out sm:text-xl"
            style={{
              transform: 'translateX(calc(var(--proximity) * 10px))',
              color: 'color-mix(in oklch, var(--color-accent) calc(var(--proximity) * 100%), var(--color-ink-secondary))',
            }}
          >
            {example.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
