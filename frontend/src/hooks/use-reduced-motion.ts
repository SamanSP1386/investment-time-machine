'use client';

import { useEffect, useState } from 'react';

/**
 * JS-level `prefers-reduced-motion` detection. globals.css's global
 * `@media (prefers-reduced-motion: reduce)` override (which collapses every
 * `animation-duration`/`transition-duration` to ~0) is this project's usual
 * mechanism (BRAND_CONSTITUTION.md §8) and is sufficient for ordinary CSS
 * transitions. It cannot collapse a JS-scheduled timeline (`setTimeout`-driven
 * phrase reveals and pauses, as the Results opening sequence uses,
 * EXPERIENCE_CONSTITUTION.md §9) — a component that schedules its own delays
 * needs to know the preference directly and skip scheduling altogether.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleChange(event: MediaQueryListEvent) {
      setReduced(event.matches);
    }

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return reduced;
}
