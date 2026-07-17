'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DisclosureProps {
  /** The always-visible trigger label/content, rendered next to the rotating chevron. */
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  summaryClassName?: string;
  chevronClassName?: string;
}

/**
 * The one shared disclosure primitive (M7 Phase 3D-1, Craft & Coherence,
 * task B.8) — unifies "Source," "The Proof," "More options," and "Technical
 * details," all of which previously used native `<details>`/`<summary>`
 * with no chevron and no expand transition (an instant snap — `<details>`
 * offers no built-in animation hook for its own reveal).
 *
 * Built from a real `<button aria-expanded>` + a controlled `<div>`, not
 * native `<details>`, specifically so the open/close transition can be
 * animated at all. A chevron rotates 150ms on toggle; the content panel
 * uses the CSS grid `0fr`→`1fr` row-track technique (the standard way to
 * animate to an intrinsic/"auto" height without JS-measured pixel heights)
 * combined with an opacity fade — one shot, never scroll-linked, never
 * looping (FD-018's motion law). `inert` (native, zero extra JS) keeps
 * collapsed content out of the tab order and the accessibility tree
 * without unmounting it, so the transition always has real content to
 * animate against, never a remount.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  onOpenChange,
  className,
  summaryClassName,
  chevronClassName,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  function toggle() {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div className={className}>
      {/*
       * M7 Phase 3D-4 completion (founder gap 1) — the summary row previously
       * defined NO hover/focus state at all (a §15 Component State System
       * gap: "every interactive element must define its states explicitly").
       * It now carries the same two standard treatments every other
       * interactive row/chip in the product already has: the target-bracket
       * corner marks (item 12's "viewfinder lock," matching the Landing
       * example rows and the Simulator's example chips) and a quiet
       * hover/focus color shift on the chevron glyph (§15's "color luminance
       * shift only" hover rule). Applied here, on the one shared primitive,
       * so The Proof, Technical details, More options, and ErrorState's
       * disclosure all pick it up through a single point of control.
       */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className={cn(
          'target-brackets group flex w-full cursor-pointer items-center gap-2 text-left select-none',
          summaryClassName
        )}
      >
        <ChevronRight
          aria-hidden
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-ink-muted transition-[transform,color] duration-150 ease-out group-hover:text-ink-primary group-focus-visible:text-ink-primary',
            open && 'rotate-90',
            chevronClassName
          )}
        />
        {summary}
      </button>
      <div
        id={contentId}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          {children}
        </div>
      </div>
    </div>
  );
}
