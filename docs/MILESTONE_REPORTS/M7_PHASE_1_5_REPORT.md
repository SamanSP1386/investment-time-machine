# M7 Phase 1.5 Report — Frontend Foundation Hardening

**Date**: 2026-07-16 (Phase 1.5), 2026-07-17 (Phase 1.5 Cleanup)
**Version**: 0.8.1
**Status**: Complete

Backfilled historical summary — written after the fact from `docs/DEVLOG.md`'s 2026-07-16/2026-07-17 entries, `docs/CHANGELOG.md`'s `[0.8.1]` entry, `docs/ARCHITECTURE_DECISIONS.md` (ADR-028 through ADR-032), `docs/KNOWN_ISSUES.md` (KI-036 through KI-042), and `docs/PROJECT_STATE.md`. No work described here was invented for this report.

---

## Objective

An external-architecture-review-driven hardening pass on M7 Phase 1's foundation, before any product page was built: verify the foundation actually works as designed rather than assuming a design-reviewed, already-shipped implementation is correct — the same discipline the backend side of this project applies via its own testing/verification culture, now applied to the frontend for the first time.

## Scope

`frontend/src/{lib/format,lib/query,lib/next-error-boundary.ts,styles/tokens,app/dev/playground}`, plus regression tests for the same. No product page was built. A follow-up cleanup pass one day later (2026-07-17) touched `docs/{KNOWN_ISSUES,PROJECT_STATE,SECURITY_LOG}.md`, `.github/workflows/ci.yml` (new frontend CI job), and `frontend/src/lib/format/README.md` — no frontend application code changed in that second pass.

## Features Implemented

No product features — this is a hardening/infrastructure phase. Concretely delivered:

- **A financial-formatting layer** (`src/lib/format/`): a branded `DecimalString` type, string-only (never `Number()`/`parseFloat()`/`parseInt()`) currency/percentage/date/date-range formatters, and reason-coded nullable formatters (`formatNullableCurrency`/`formatNullablePercentage`) resolving the dual-meaning-null problem (a `null` inflation-adjusted value can mean "not requested" or "data unavailable" — two different facts).
- **A lint-enforced financial-math guardrail** (ADR-029): a `no-restricted-syntax` ESLint rule banning `Number(`/`parseFloat(`/`parseInt(`/unary `+` in `src/app/**`/`src/components/**`.
- **TanStack Query conventions fixed before any page uses them** (ADR-032): a query-key factory (`src/lib/query/keys.ts`), a written convention document, and one reference hook (`useAssetSearch`) demonstrating the full pattern end-to-end.
- **A dev-only visual playground** (`src/app/dev/playground/`), guarded by `notFound()` in production, verified against both the actual compiled static output and an automated test.
- **`unstable_retry` isolated behind one shared type** (ADR-031, `src/lib/next-error-boundary.ts`).
- **Live API-contract drift detection** (ADR-030, `src/__tests__/lib/api-contract-drift.test.ts`) — fetches the backend's real `/openapi.json` and asserts specific field names are present, skipping gracefully when no backend is reachable.

## Foundation Hardening Completed Before Implementation

This phase *is* the hardening pass. It found and fixed two real, already-shipped defects — neither caught by Phase 1's own verification — by building verification mechanisms rather than re-reading prior work and assuming it was correct:

1. **A WCAG contrast failure and a CSS self-reference bug (ADR-028, KI-037)**: computing real contrast ratios (not eyeballing them) against the Phase 1 token hex values found that `ink-muted` and three of four status colors failed AA (4.5:1) as text color in at least one theme. Separately, `semantic.css` contained a literal self-referencing custom property (`--color-status-good: var(--color-status-good)`), invalid per the CSS Custom Properties spec, silently breaking Badge's status-color differentiation — confirmed against the actual compiled production CSS, not just source inspection. Fixed by splitting every affected color into verified light/dark primitive pairs and correcting the self-reference; a permanent known-answer regression test (`contrast.test.ts`) now asserts every ink/status text-color pairing meets 4.5:1 in both themes.
2. **Real API-contract drift (ADR-030, KI-036/KI-038)**: reading the backend's actual Pydantic schemas directly (not `docs/api_design.md`'s prose description of them) found `GrowthSeriesPoint`/`DisclosedSplit`'s date fields were wrongly guessed as `date` (actually `point_date`/`split_date`), and six `SimulationResponse` fields were wrongly typed as always-present rather than nullable, with `error_message` missing entirely. Fixed in `src/types/api.ts`, verified against both a live running backend and the graceful-skip path.

## UX Decisions

None product-facing this phase (no screen was built). One frontend-facing UX-adjacent decision: the dev-only playground exists specifically so tokens/primitives can be visually verified in both themes *before* a product screen consumes them — a verification tool, not a product feature.

## Trading-Day Guidance Decision

Not applicable — no Simulator UI existed yet.

## Testing Summary

61 new tests (103 total: 42 from Phase 1 + 61 new), 95.18%/97.07%/81.81%/92.53% statement/lines/branch/functions coverage, all passing (4 gracefully skipped when no backend is reachable). Notable additions: a known-answer WCAG contrast test (17 cases), `axe-core` structural accessibility tests for every primitive, keyboard-operability tests, a static reduced-motion-mechanism check, a format-module static-analysis guardrail test, and query-key/hook tests.

Four issues surfaced and were fixed during this phase, none a defect in the code under test: (1) the static-analysis guardrail test initially failed against its own target module, because the module's JSDoc comments quote `Number(...)` as documentation of what not to do — fixed by stripping comments before scanning. (2) `Object.defineProperty(process.env, 'NODE_ENV', ...)` failed in the playground-guard test — fixed by switching to `vi.stubEnv()`. (3) A second playground-guard test hit an unrelated Vitest/React module-caching quirk — resolved by dropping that specific test (the property it verified was already proven by a manual dev-server check and a build-output inspection) rather than chasing a tooling quirk unrelated to the guard's own correctness. (4) The contrast test's WCAG formula was independently verified via a standalone Node script before being trusted as the basis for new hex-value decisions.

A follow-up cleanup pass (2026-07-17) found that **no frontend CI job existed at all** (KI-041) while investigating a narrower question (whether the drift test was CI-enforced) — added a `frontend-lint-and-test` CI job (lint, typecheck, full test suite, production build) mirroring the backend job's structure, closing the general gap; the drift test's live-schema assertions still only run when a real backend is reachable in CI, recorded as KI-041's explicitly-remaining half.

## Accessibility Summary

`axe-core` run directly against jsdom-rendered output for all eight primitives, zero violations (with `color-contrast` explicitly disabled and documented as to why jsdom can't evaluate it meaningfully — contrast is instead covered for real by the known-answer test above). Keyboard-operability tests: Tab/Enter/Space activation on `Button`, Tab correctly skipping a disabled/loading button, `StatTile`'s disclosure exercised via click (documented as the practical jsdom proxy for keyboard activation). A static reduced-motion-mechanism check confirms the global `prefers-reduced-motion` CSS override exists, is unconditional, and actually zeroes both `animation-duration` and `transition-duration`.

## Performance Summary

No measurable change to bundle size or build time from this phase's additions — the format/query modules are small, pure-logic files; `axe-core` is a dev-only test dependency, never shipped to production.

## Security Notes

No vulnerability found or introduced in frontend code. One genuine, previously undocumented production-deployment risk found: **KI-039** — `SameSite=Strict` cookies (Founder Decision 002, ADR-018) require a shared custom parent domain between frontend and backend that nothing in `.claude/SYSTEM.md`'s approved infrastructure list currently enforces or even states as a requirement; if the platform ships on each provider's default subdomain, authentication would silently fail for every user in production. Tracked, not fixed here (a deployment-configuration decision, not a code change this phase could make). Upgraded from Medium-High to **High** during the follow-up cleanup pass, since the failure mode triggers on the *first* deployed staging/demo environment, not only production. A second, related tradeoff (**KI-042**) was documented during the same cleanup pass: `SameSite=Strict` also withholds a cookie on the first top-level navigation arriving from an external site — assessed and accepted as a deliberate tradeoff, since the one affected use case (an authenticated user's own saved-simulation link) isn't a built feature yet.

## Known Issues

**Resolved this phase**: KI-036 (wrong `GrowthSeriesPoint`/`DisclosedSplit` field names), KI-037 (the contrast/self-reference bug), KI-038 (six wrongly-typed `SimulationResponse` fields), KI-010 (already resolved at Phase 1, restated).

**Opened this phase**: KI-039 (High — custom-domain requirement for `SameSite=Strict`, upgraded from Medium-High during the follow-up pass), KI-040 (Low — theme-script CSP interaction, deferred design note), KI-041 (Partially Resolved — general frontend CI gap fixed; live-backend-in-CI gap remains), KI-042 (Low — `SameSite=Strict` external-referrer tradeoff, deliberately accepted).

## Lessons Learned

The single biggest lesson: **verification that only reads your own prior work will not find your own prior work's mistakes.** The contrast bug survived Phase 1's own accessibility-conscious design and review because nobody had actually computed a contrast ratio against the shipped hex values; the API-contract-drift bugs survived because nobody had actually read the backend's real Pydantic field names, only `docs/api_design.md`'s prose description of them. Both were found the moment this phase was asked to build a *verification mechanism* rather than merely assert one wasn't needed. A related lesson from the follow-up pass: answering a narrow verification question honestly ("is this one test CI-enforced?") surfaced a more consequential root cause (no frontend CI existed at all) — a "small cleanup pass" is often the moment a genuinely bigger, adjacent gap surfaces, and it's worth following the honest answer to its root rather than a satisfying-sounding non-answer.

## Recommended Next Phase

M7 Phase 2 — Product Screens, starting with the Simulator → Results flow, now on a hardened foundation with real formatting/query/error conventions fixed rather than left for Phase 2 to improvise. (Executed — see `M7_PHASE_2_REPORT.md`.)
