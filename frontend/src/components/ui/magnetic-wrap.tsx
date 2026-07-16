'use client';

import type { ReactNode } from 'react';
import { useCoarsePointer } from '@/hooks/use-coarse-pointer';
import { useMagnetic } from '@/hooks/use-magnetic';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

/**
 * Magnetic primary CTAs (M7 Phase 3D-4, item 10) — wraps exactly two
 * elements in the product, the Simulator's "Run simulation" button and the
 * Landing page's primary CTA, and nothing else (the task's own explicit
 * scope: "Run simulation + landing CTA only"). Disabled outright for touch
 * (`useCoarsePointer`) and `prefers-reduced-motion` (`useReducedMotion`) —
 * when disabled, `useMagnetic` attaches no listeners and schedules no
 * `requestAnimationFrame` at all, so this renders as a completely inert
 * `<span>` with no runtime cost, not a degraded animation.
 *
 * `className` carries layout classes that would otherwise sit on the
 * wrapped `Button`/`Link` itself (e.g. `self-start` inside a flex column) —
 * `self-start` only does anything on a direct flex/grid item, so it has to
 * move to whichever element is actually that item once a wrapper is
 * introduced.
 *
 * `w-fit` is load-bearing, not cosmetic (3D-4 reality-gap fix): as a direct
 * item of a column flex container (the Landing hero), a plain `inline-block`
 * span is cross-axis-STRETCHED to the full column width, so `useMagnetic` —
 * which measures THIS wrapper's rect — centered its 80px pull radius on the
 * middle of an 780px row of mostly empty space, and hovering the actual
 * button (radially ~200px from that center) produced no pull at all.
 * `fit-content` opts the wrapper out of flex stretching everywhere, so the
 * measured rect is always the wrapped control's own.
 */
export function MagneticWrap({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const enabled = !reducedMotion && !coarsePointer;
  const ref = useMagnetic<HTMLSpanElement>(enabled);

  return (
    <span
      ref={ref}
      className={cn('inline-block w-fit [transform:translate(var(--magnetic-x,0px),var(--magnetic-y,0px))]', className)}
    >
      {children}
    </span>
  );
}
