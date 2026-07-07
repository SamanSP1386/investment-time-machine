# M7 Phase 2 Report — Simulator Experience

**Date**: 2026-07-18
**Version**: 0.9.0 → 0.9.2 (0.9.0: punch-list fixes + Simulator; 0.9.1: ingestion reliability fix; 0.9.2: final UX polish)
**Status**: Complete, pending founder review

Written from `docs/DEVLOG.md`'s four 2026-07-18 entries, `docs/CHANGELOG.md`'s `[0.9.0]`–`[0.9.2]` entries, ADR-033 through ADR-035, KI-043/KI-044, and `docs/BRAND_CONSTITUTION.md`/`docs/frontend_design_system.md`. No work described here was invented for this report.

---

## Objective

Close seven foundation gaps flagged in a pre-build review, then build the Simulator — the platform's first real product screen and the entry point to its core "simulate-and-explain loop" (`.claude/MVP_RULES.md`) — as an input-only screen that collects, validates, and submits, but never calculates a financial value itself. Finish with a founder-directed UX polish pass (trading-day guidance, educational error copy) before tagging the phase complete.

## Scope

`frontend/src/app/global-error.tsx`, `frontend/src/config/env.ts`, `frontend/src/lib/format/` (new `compare-decimal-string.ts`), `frontend/eslint.config.mjs`, `frontend/src/app/globals.css`, `frontend/src/lib/api/{client.ts,endpoints/assets.ts}`, `frontend/src/hooks/` (new `use-simulation.ts`, `use-asset-availability.ts`, updated `use-asset-search.ts`), `frontend/src/components/simulator/` (new), `frontend/src/app/simulator/` (new). Adjacent backend-side scope: `backend/app/ingestion/providers/dev_seed_provider.py` (new, a local-dev-only fixture provider unblocking manual testing after a real yfinance failure — see Known Issues). Explicitly out of scope per instruction: the Results screen (beyond an inline, no-navigation success state), charts, the AI panel, dashboard/history/account screens, and any change to backend validation or the Simulation Engine.

## Features Implemented

The Simulator screen (`/simulator`): asset search/autocomplete, investment amount, start/end date, dividend-reinvestment and inflation-adjustment toggles (behind a "More options" disclosure), full client-side validation (the wire-level Zod schema plus a client-only end-after-start date refinement), a pre-submit availability check (clamping date inputs to an asset's actual historical range once selected), trading-day educational guidance (below), a named-step loading state ("Calculating historical returns…"), central error-code-to-copy rendering for API failures, and a calm inline success card (simulation ID, status, echoed inputs, a "Start a new simulation" reset) — explicitly no navigation to an unbuilt Results route, a deliberate decision confirmed with the founder rather than assumed.

Shared components built to support it: `AssetSearchCombobox` (a full ARIA combobox — `role="combobox"`/`role="listbox"`, arrow-key/Enter/Escape handling, an `aria-live` result-count announcement, an informative empty state for a genuine zero-result search, central error-copy rendering for a search failure), `useCreateSimulation` and `useAssetAvailability` (following the query conventions Phase 1.5 fixed in advance).

## Foundation Hardening Completed Before Implementation

Seven gaps closed before any Simulator code was written, per direct instruction that the Simulator not be built on an unverified foundation:

1. **Crash-boundary digest color**: `global-error.tsx`'s inline digest color corrected from the already-known-bad shared `#898781` (ADR-028/KI-037) to the approved `#6b6963`.
2. **Production env fallback**: `config/env.ts`'s `localhost:8000` development fallback no longer applies when `NODE_ENV === 'production'` — a production build with a missing/invalid API URL now fails fast at module load instead of silently defaulting, closing a real deployment-safety gap.
3. **Decimal-comparison guardrail (ADR-033)**: added `compareDecimalStrings` (string-only digit comparison, never `Number()`) plus an ESLint ban on bare `</>/<=/>=` operators in product/UI code — the one financial-math guardrail gap ADR-029 (comparison, not coercion) didn't cover.
4. **`@theme inline` self-reference regression guard**: a static test distinguishing Tailwind v4's intentional bridge syntax from a genuine self-reference bug like ADR-028's, asserting the token CSS files never contain a real one.
5. **Guardrail scope expansion**: the financial-math ESLint guardrail's file scope expanded from `app/**`/`components/**` to also cover `hooks/**`, `providers/**`, `lib/**` — a hook or shared helper is just as capable of an accidental coercion/comparison mistake as a component is.
6. **Axios timeout + `AbortSignal`**: a bounded 15s request timeout, plus `AbortSignal` threaded through asset-search endpoints so TanStack Query can cancel a stale in-flight search the moment a newer keystroke supersedes it.
7. **Breakpoint namespace lock (ADR-034)**: `--breakpoint-*: initial` reset in `globals.css` before redeclaring the three approved breakpoints, so Tailwind's built-in `xl`/`2xl` utilities — silently still available despite the design system's explicit three-tier scale — can no longer exist.

## UX Decisions

- **Inline success, no navigation** (confirmed with the founder, not assumed): on successful submission, the Simulator renders a calm success `Card` in place of the form rather than navigating to a placeholder Results route — avoids building routing/data-fetching for a screen explicitly out of this phase's scope, and avoids a dead-end route existing before Results is real.
- **Native `<input type="date">`, not a custom datepicker**: matches `docs/BRAND_CONSTITUTION.md`'s unambiguous-date rule without building a component this phase's punch list didn't ask for.
- **`inputMode="decimal"` text field, never `type="number"`**: a native number input would let the browser silently coerce or round the value — the investment amount is validated as a decimal string end-to-end, consistent with the platform-wide "never touch a financial value's digits except through `src/lib/format`" rule.
- **"More options" disclosure for dividend/inflation toggles**: matches `frontend_design_system.md` §12's per-component responsive strategy for the Simulator form (progressive disclosure on the primary, mobile-heavy persona's path).
- **A modest Time Axis touch**: a kicker label and one hairline rule above the form heading — deliberately restrained, per `docs/BRAND_CONSTITUTION.md` §5's explicit anti-gimmick rule ("never ornamental... if a proposed use of the motif doesn't organize real content, it doesn't belong").

## Trading-Day Guidance Decision

The backend correctly rejects a weekend/market-holiday date with `MISSING_HISTORICAL_DATA` rather than silently substituting a nearby trading day — an intentional, unchanged behavior (`docs/simulation_formulas.md`, "Historical Truth Is Sacred"). The gap this phase closed was purely on the UX side, at the founder's direction: users had no way to anticipate this rule before hitting it. Two additions, both purely educational, neither adjusting, guessing, or calculating a trading calendar:

- **Pre-submit guidance**: a calm, static caption beneath the date-input grid stating that stocks/ETFs have no price data on weekends or market holidays, encouraging (never enforcing) a trading-day choice, and stating the product's own philosophy directly — dates are never moved automatically, because historical accuracy matters more than convenience.
- **Post-error copy**: `ERROR_COPY.MISSING_HISTORICAL_DATA` rewritten from a terse "this asset doesn't have price data for the selected range" to the same educational framing plus a plain remedy ("choose different dates and try again"), routed through the same central error-copy table every other API error already uses.

This is the concrete implementation of `docs/BRAND_CONSTITUTION.md` §2's "honest about uncertainty" trait and §9's "errors state what happened in plain language" rule, applied to a case the founder specifically named.

## Testing Summary

144 tests from the punch-list-fixes-and-Simulator build (34 new, on top of 110 carried forward), then one further test updated and one added in the final UX polish pass — **145 total, 141 passing, 4 gracefully skipped without a live backend**. Coverage: 93.56% statements / 81.6% branches / 92.7% functions / 95.74% lines. Test coverage spans: a `compareDecimalStrings` known-answer suite, static regression tests for the token-namespace and breakpoint-lock fixes, hook tests (including `AbortSignal` forwarding), a full `AssetSearchCombobox` interaction suite (debounced search, keyboard selection, empty/error states, Escape-to-close), and a `SimulationForm` suite (inline validation for both the wire schema and the date-range refinement, a valid-submit payload assertion, the named-step loading label, central error-copy rendering including the rewritten `MISSING_HISTORICAL_DATA` copy, the inline success card, the "Start a new simulation" reset, and the trading-day guidance text). `npx eslint .` and `npx tsc --noEmit` pass with zero errors throughout; `npm run build` succeeds with `/simulator` prerendering as static content.

One real, self-caught bug was found and fixed during this phase's own post-build review (KI-043): `AssetSearchCombobox`'s displayed text is uncontrolled state that survived React Hook Form's `reset()` on "Start a new simulation." Fixed via a `key`-based remount of the form subtree — found by deliberately re-driving the actual reset flow as a reviewer, not by a failing test (the existing suite was green).

## Accessibility Summary

`AssetSearchCombobox` implements the full ARIA combobox pattern (`role="combobox"`, `role="listbox"`, `aria-expanded`, `aria-activedescendant`, an `aria-live` result-count region) and was exercised via keyboard-only interaction in its test suite (arrow-key navigation, Enter to select, Escape to close), not mouse events. Checkboxes and the "More options" disclosure use native `<input type="checkbox">` and `<details>`/`<summary>` — zero-JS-needed, screen-reader-operable patterns already established at Phase 1. 44×44px (`min-h-11`) touch targets on checkbox rows. No dedicated `axe-core` pass was run against the Simulator screen specifically this phase — carried forward as a gap to close alongside or before the Results screen, matching this project's established accessibility-pass cadence (a full pass was run in Phase 1.5 against the primitives; a screen-level pass is still owed).

## Performance Summary

No new runtime dependency added (React Hook Form, `@hookform/resolvers`, Zod, and TanStack Query were already project dependencies). `/simulator` prerenders as fully static content. `AbortSignal` threading through asset search means a stale in-flight search is cancelled the moment a newer keystroke supersedes it — a real, if modest, reduction in wasted network/render work, not just a correctness nicety. No live-backend API response time was measured (no backend was running during the punch-list/Simulator build itself; live verification happened in the ingestion-reliability follow-up). `npm run build` completes in ~4-12s across this phase's several passes; `npm run test:coverage` (145 tests) completes in ~12-25s.

## Security Notes

The production env-fallback fix (punch-list item 2) closes a real, if narrow, deployment-safety gap: previously, a production build missing `NEXT_PUBLIC_API_BASE_URL` would have silently shipped pointed at `localhost:8000` instead of failing to build. The Simulator introduces no new auth-sensitive surface — asset search and simulation creation are both public per `docs/api_design.md` §2/§4. Investment amount is validated as a decimal string end-to-end and never parsed to a JS number anywhere in the new code, enforced both by the expanded ESLint guardrail (ADR-033) and confirmed by manual review. `DevSeedProvider` (the local-dev ingestion mitigation built alongside this phase to enable manual testing) refuses to construct outside a development/test `ENVIRONMENT`, preventing fabricated data from ever being reachable in production even via operator error.

## Known Issues

**Resolved within this phase** (found and fixed in the same session they were introduced, the same immediate-self-catch discipline Phase 1.5 established): KI-043 (stale `AssetSearchCombobox` text surviving a form reset).

**Opened, still open**: KI-044 (Medium) — `yfinance==0.2.44`'s crumb-negotiation endpoint gets rate-limited (HTTP 429) by Yahoo, breaking all yfinance ingestion identically inside and outside Docker; root-caused via yfinance's own debug mode, confirmed via direct testing to be neither a Docker networking issue nor a wholesale IP block. Mitigated for local development via `DevSeedProvider` (ADR-035, `--provider dev_seed`) — a small, deterministic, clearly-synthetic fixture provider going through the unmodified ingestion pipeline, guarded against ever running outside development/test — but the underlying cause (a `yfinance` version bump, verified against a live non-rate-limited window) remains unresolved.

**Unaffected by this phase, carried forward**: KI-016 (split-consistency assumption, High, unrelated), KI-021/FD-008 (`growth_series`/`disclosed_splits` persistence — the Results screen's own blocking prerequisite), KI-039 (High — `SameSite=Strict` custom-domain requirement, no deployment configuration touched this phase), KI-042 (Low — `SameSite=Strict` external-referrer tradeoff).

## Lessons Learned

Foundation-before-features discipline paid off concretely: none of the seven punch-list fixes were discovered *during* the Simulator build — they were found and closed in a dedicated pre-build pass, so the Simulator itself could be built against a foundation already re-verified rather than one merely assumed correct from Phase 1.5. Within the build itself, KI-043 reinforced the same lesson Phase 1.5 drew from the contrast and contract-drift bugs: a feature that passes its own tests can still have a real, user-visible defect in a code path the tests didn't specifically exercise — deliberately re-driving the actual reset flow as a reviewer, not just re-reading passing test output, is what caught it. The ingestion-reliability side-quest (KI-044) reinforced a complementary lesson: root-causing an ambiguous failure through direct evidence (reproducing outside Docker, testing the raw endpoint manually, using the library's own debug instrumentation) rather than accepting the first plausible-sounding story is what actually found the real cause, and pausing on a destructive database cleanup the permission system correctly flagged — rather than working around it — is exactly the caution this project's own safety principles call for. Finally, the UX polish pass reinforced `docs/BRAND_CONSTITUTION.md`'s own stated priority order directly: the fix for a correct-but-surprising backend constraint is to explain it better, never to work around it.

## Recommended Next Phase

**M7 Phase 3 — Results Experience**, gated on `growth_series`/`disclosed_splits` persistence (KI-021/FD-008) landing before or alongside it, and on the Results screen designing `status !== 'completed'` (nullable fields, `error_message`) as a real, first-class case per KI-038 — the Simulator's own success card already models a narrow version of this pattern (rendering `error_message` for a `failed` simulation), but the Results screen is where it matters in full. **Not started per direct instruction** — awaiting founder approval of this phase before continuing.
