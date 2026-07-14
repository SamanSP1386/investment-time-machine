import { Skeleton } from '@/components/ui/skeleton';

/**
 * A skeleton shaped like the completed Results layout (hero sentence,
 * Supporting Facts row, chart) — never a generic spinner
 * (frontend_design_system.md §10). Extracted from
 * `simulation-result-client.tsx` (M7 Phase 3D-4, item 3) so the Simulator's
 * own submit-time interstitial can render the exact same shape while the
 * `POST /api/v1/simulations` request is genuinely in flight, rather than a
 * second, visually distinct loading treatment the user sees only after
 * navigating. `.skeleton-shimmer` (globals.css) sweeps at most twice, then
 * stops (FD-018 — no infinite/ambient animation); under
 * `prefers-reduced-motion` the two passes complete imperceptibly and every
 * block just reads as its static resting color.
 */
export function ResultsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-10 sm:gap-14">
      <span className="sr-only">Loading simulation…</span>
      <div aria-hidden className="flex flex-col gap-6 sm:gap-8">
        <Skeleton className="h-3 w-40" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full max-w-2xl sm:h-12" />
          <Skeleton className="h-9 w-3/4 max-w-xl sm:h-12" />
        </div>
      </div>
      <div aria-hidden className="flex flex-col gap-14 sm:gap-20">
        <div className="grid grid-cols-1 gap-8 border-t border-b border-border-hairline py-8 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-48 w-full sm:h-64" />
        </div>
      </div>
    </div>
  );
}
