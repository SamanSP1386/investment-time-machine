'use client';

import { useState } from 'react';

/**
 * Extracted from `example-simulations-list.tsx` (M7 Phase 3D-4, item 10) —
 * a second call site (`use-magnetic.ts`) needs the identical "is this a
 * touch/coarse-pointer device" check, and duplicating the same three-line
 * `useState` initializer a second time would be the kind of copy-paste this
 * codebase's own reuse discipline argues against. Read once, at mount —
 * a device's pointer coarseness doesn't change mid-session in any way this
 * product needs to react to live.
 */
export function useCoarsePointer(): boolean {
  const [coarse] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(pointer: coarse)').matches
  );
  return coarse;
}
