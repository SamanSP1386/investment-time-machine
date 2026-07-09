'use client';

import { useEffect, useRef, useState } from 'react';

export type OpeningSequencePhase = 'composing' | 'paused' | 'answered' | 'settled';

/** Stagger between each input phrase's reveal — cadence of thoughtful writing, never terminal typing. */
const STAGGER_MS = 200;
/** Scene 4's silent pause between the last input phrase and the answer — "approximately one second." */
const PAUSE_MS = 1000;
/** How long the answer sits alone before the sentence settles into the permanent heading (Scene 6). */
const ANSWER_HOLD_MS = 550;

export interface UseOpeningSequenceResult {
  phase: OpeningSequencePhase;
  /** How many of the leading input phrases (asset, amount, dates) are currently revealed. */
  visiblePhraseCount: number;
  /** Jumps straight to the settled end state — the sequence's one required skip affordance. */
  skip: () => void;
}

/**
 * Drives Scenes 2–6 of the Results opening sequence (M7 Phase 3B.1):
 * phrases composing in one at a time, a silent pause, the answer's calm
 * arrival, then settling into the permanent page heading. `active` gates
 * the whole timeline — when false (a reduced-motion preference, a
 * revisited/shared simulation, a non-completed status), this starts and
 * stays at the fully settled end state with no scheduling at all, which is
 * how "jump directly to the final state, information identical" is
 * satisfied for every one of those cases.
 *
 * Callers must only mount the component that calls this hook once `active`
 * is already knowable (i.e. after the simulation has loaded) — mounting it
 * earlier and flipping `active` true only after the fact would otherwise
 * flash the fully-settled state for one frame before resetting into the
 * composing state.
 */
export function useOpeningSequence(phraseCount: number, active: boolean): UseOpeningSequenceResult {
  const [phase, setPhase] = useState<OpeningSequencePhase>(active ? 'composing' : 'settled');
  const [visiblePhraseCount, setVisiblePhraseCount] = useState(active ? 0 : phraseCount);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearScheduled() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }

  function skip() {
    clearScheduled();
    setVisiblePhraseCount(phraseCount);
    setPhase('settled');
  }

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    // eslint-disable-next-line no-restricted-syntax -- loop-counter comparison, not a DecimalString comparison (ADR-033).
    for (let i = 0; i < phraseCount; i += 1) {
      timeoutsRef.current.push(setTimeout(() => setVisiblePhraseCount(i + 1), STAGGER_MS * (i + 1)));
    }
    const afterPhrases = STAGGER_MS * phraseCount;
    timeoutsRef.current.push(setTimeout(() => setPhase('paused'), afterPhrases));
    timeoutsRef.current.push(setTimeout(() => setPhase('answered'), afterPhrases + PAUSE_MS));
    timeoutsRef.current.push(
      setTimeout(() => setPhase('settled'), afterPhrases + PAUSE_MS + ANSWER_HOLD_MS)
    );

    return clearScheduled;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- phraseCount is a fixed constant from the caller; re-keying on it is defensive, not expected to actually change.
  }, [active]);

  return { phase, visiblePhraseCount, skip };
}
