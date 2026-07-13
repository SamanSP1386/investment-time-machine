'use client';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTypewriter } from '@/hooks/use-typewriter';

const HERO_TEXT = 'If you had invested — what would it be worth today?';

/**
 * The Landing page's hero (FD-018.2) — the product question, in serif
 * display, typed once on load. `prefers-reduced-motion` renders the full
 * sentence instantly with no cursor at all (`useTypewriter`'s `wasActive`
 * capture), matching every other one-shot motion pattern in this codebase
 * (`useScramble`, `useSettleIn`). Nothing else on the page waits for this to
 * finish — every sibling section renders immediately regardless of typing
 * progress (Founder Decision 017's immediate-render principle, extended
 * here to the one new motion pattern this decision approves).
 */
export function TypedHeroHeading() {
  const reducedMotion = useReducedMotion();
  const { text, showCursor } = useTypewriter(HERO_TEXT, !reducedMotion);

  return (
    <h1
      aria-label={HERO_TEXT}
      className="max-w-3xl font-serif text-[clamp(2.25rem,4vw+1rem,4.75rem)] leading-[1.15] font-medium text-ink-primary"
    >
      <span aria-hidden="true">{text}</span>
      {showCursor ? (
        <span
          aria-hidden="true"
          className="typewriter-cursor ml-1 inline-block h-[0.85em] w-[3px] translate-y-[0.1em] bg-accent align-middle"
        />
      ) : null}
    </h1>
  );
}
