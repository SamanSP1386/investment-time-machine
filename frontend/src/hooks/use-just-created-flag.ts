'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const JUST_CREATED_PARAM = 'new';

/**
 * Reads the one-shot `?new=1` marker `SimulationForm` appends when it
 * navigates to a freshly-completed simulation's Results page, then
 * immediately strips it from the URL — so a refresh, a browser-back, or a
 * copied/shared link never carries it. This is the "play exactly once"
 * mechanism the Results opening sequence's replay rules depend on
 * (M7 Phase 3B.1).
 *
 * A URL marker rather than a sessionStorage one specifically because
 * reading it is a pure `URLSearchParams.get` call, safe to run twice under
 * React Strict Mode's dev double-invocation of state initializers — a
 * sessionStorage read-and-clear is not idempotent under that same
 * double-invocation, since the second call would find the first call's
 * side effect already applied and silently return the wrong answer.
 */
export function useJustCreatedFlag(): boolean {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [wasJustCreated] = useState(() => searchParams.get(JUST_CREATED_PARAM) === '1');

  useEffect(() => {
    if (searchParams.get(JUST_CREATED_PARAM) === '1') {
      router.replace(pathname, { scroll: false });
    }
    // Runs once, immediately, to scrub the marker before any later
    // navigation/refresh could see it again — not tied to searchParams
    // identity, which changes on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return wasJustCreated;
}
