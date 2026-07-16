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
 *
 * `(any-pointer: fine)`, not `(pointer: coarse)`: `pointer` reports only the
 * PRIMARY pointer, and touch-primary Windows convertibles/touchscreen
 * laptops report `pointer: coarse` even with a mouse attached — which would
 * silently disable every hover-proximity effect for a user who is actually
 * mousing. Only treat the device as coarse when NO fine pointer exists at
 * all (3D-4 reality-gap fix).
 */
export function useCoarsePointer(): boolean {
  const [coarse] = useState(() =>
    typeof window === 'undefined' ? false : !window.matchMedia('(any-pointer: fine)').matches
  );
  return coarse;
}
