# M7 Phase 1 Report — Frontend Foundation

**Date**: 2026-07-15
**Version**: 0.8.0
**Status**: Complete

Backfilled historical summary — written after the fact from `docs/DEVLOG.md`'s 2026-07-15 entry, `docs/CHANGELOG.md`'s `[0.8.0]` entry, `docs/ARCHITECTURE_DECISIONS.md` (ADR-025 through ADR-027), and `docs/TESTING_REPORT.md`/`docs/SECURITY_LOG.md`/`docs/PERFORMANCE_LOG.md`'s M7 Phase 1 entries. No work described here was invented for this report.

---

## Objective

Build the platform's first frontend code — a scalable architectural foundation every future page builds on — per the approved M7 Phase 0 design foundation (`docs/BRAND_CONSTITUTION.md`, `docs/frontend_design_system.md`, Founder Decision 004). Explicitly scoped to tokens, theming, shared providers, the API client, and primitive components only; no product page was built.

## Scope

`frontend/` scaffolded from scratch via `create-next-app` (Next.js 16.2.10, App Router, TypeScript, Tailwind v4). Design tokens (three-layer CSS-variable architecture), light/dark theme switching, shared providers (Theme, TanStack Query, Toast, error boundaries), a centralized Axios API client with typed models and one error-code-to-copy table, eight primitive UI components, and a Vitest + React Testing Library test suite. Explicitly excluded per direct instruction: the Simulator, Results, Asset Explorer, Simulation History, and Auth pages, and any chart component.

## Features Implemented

No product features — this phase is infrastructure. Concretely delivered:

- **Design tokens**: `src/styles/tokens/{primitives,semantic,components}.css` — three-layer, runtime-switchable CSS custom properties covering brand/neutral/chart/status/AI color families, type scale, spacing, radius, elevation, motion durations/easings, and a new six-tier z-index scale (not specified in any Phase 0 document, invented here since neither Tailwind v4 nor the design system addressed stacking order).
- **Theming**: `src/providers/{theme-provider,theme-script}.tsx` — `data-theme` attribute switching via a synchronous inline `<head>` script (this Next.js version's own documented flash-prevention pattern), a `useTheme()`/`setTheme()` hook, no rendered toggle yet (deliberate, per the Brand Constitution).
- **Shared providers**: `src/providers/{query-provider,toast-provider,app-providers}.tsx` and `src/app/{error,global-error,not-found}.tsx` (Next 16.2's `unstable_retry`-based error boundaries).
- **API layer**: `src/lib/api/{client,errors,index}.ts` and `src/lib/api/endpoints/{assets,simulations}.ts` — one Axios instance (`withCredentials: true`), one `apiRequest<T>()` entry point, one pure `normalizeApiError()` function, one `ERROR_COPY` table, and a Zod schema matching the simulation-creation request contract. `src/types/api.ts` mirrors `docs/api_design.md`/`backend/app/models/enums.py`, keeping every financial figure a `string` end-to-end.
- **Eight primitive components** (`src/components/ui/`): Button, Input, Card, Badge, Skeleton, EmptyState, ErrorState, StatTile — each reviewed against the Brand Constitution's Component Review Checklist.

## Foundation Hardening Completed Before Implementation

Not applicable to this phase in the strict sense — Phase 1 *is* the foundation. The hardening pass on top of it is M7 Phase 1.5 (see `M7_PHASE_1_5_REPORT.md`).

## UX Decisions

- **Token architecture (ADR-025)**: Tailwind v4's `@theme` directive is normally static at build time — the wrong fit for a token system that must switch every color at runtime for light/dark without a page reload or `dark:` variants sprinkled through every component. Solved via three physical CSS files holding real runtime CSS custom properties, switched via a `[data-theme]` attribute, then bridged into Tailwind's utility-generation layer via a thin `@theme inline` block — the same pattern shadcn/ui's own v4 template converged on for the identical problem, not a bespoke one.
- **Theme switching (ADR-026)**: hand-rolled the `data-theme` + inline-script pattern this specific Next.js version's own bundled docs recommend, rather than adopting `next-themes` — avoids a dependency for a problem this version already documents a first-party solution for.
- **API client (ADR-027)**: one centralized Axios instance and one pure error-normalization function, so no future screen ever needs to know the `{success,data}`/`{success:false,error}` envelope shape exists.
- **Primitive components**: hairline-only dividers, no scale/bounce transforms, icon+label on every Badge, tabular numerals via a shared `.figure` utility, a native `<details>`-based provenance disclosure on `StatTile` (source formula on tap/hover, zero additional JavaScript) — the Brand Constitution's signature "every number carries a legible source" detail, implemented at the primitive-component layer before any screen needed it.

## Trading-Day Guidance Decision

Not applicable — no Simulator UI existed yet.

## Testing Summary

42 new tests (the platform's first frontend suite) across 15 files, all passing. 94.26% statements / 97.29% lines / 77.27% branches / 93.87% functions — comfortably above `.claude/TESTING_GUIDELINES.md`'s 60%+ frontend target. `npx eslint .` and `npx tsc --noEmit` both pass with zero errors; `npm run build` completes successfully with both routes prerendered as static content; a manual dev-server smoke check confirmed the placeholder page renders and hydrates with `data-theme="light"` correctly applied server-side.

Two real test-technique problems were found and fixed during this phase, not defects in the code under test: (1) a fake-axios-`adapter` test technique did not trigger axios's real rejection path for a non-2xx response — fixed by extracting `normalizeApiError()` as a pure, directly-testable function (ADR-027's stated rationale for that extraction). (2) Vitest does not auto-register React Testing Library's DOM cleanup between tests the way Jest's globals detection does — fixed via `afterEach(() => cleanup())` in `vitest.setup.ts`.

## Accessibility Summary

Every primitive reviewed against the Brand Constitution's Component Review Checklist before being considered done: `role="alert"`/`aria-invalid`/`aria-describedby` wired through `ErrorState` and `Input`; `StatTile`'s provenance disclosure is a native `<details>`/`<summary>`, keyboard- and screen-reader-operable with zero additional JavaScript; Badge pairs every status color with an icon and a text label. No dedicated `axe-core` pass yet at this phase (added in Phase 1.5).

## Performance Summary

`npm run build` completes in ~4-9s; total JS chunk size ~720KB for the two-route app at this phase, with `recharts` (installed, unused) contributing zero bytes until a future chart component first imports it. No page-load budget measured yet against a real screen (no product screen existed).

## Security Notes

No vulnerability found or fixed — this phase has no user-input-handling surface yet. Five forward-looking findings confirmed the foundation doesn't foreclose later security properties (see `docs/SECURITY_LOG.md`'s M7 Phase 1 entry): correct `withCredentials` cookie handling (no `localStorage`/`sessionStorage` token handling exists anywhere, by construction, per Founder Decision 002's httpOnly-cookie design); exactly one (inert) `dangerouslySetInnerHTML` use (the theme-flash-prevention script, a fixed source-controlled string with no interpolated user data); fail-fast environment validation (`src/config/env.ts`, Zod at module load); a type-system-enforced error-copy table (`Record<ApiErrorCode, ErrorCopy>` — TypeScript's exhaustiveness checking fails the build if a code is added to one but not the other); no secrets committed.

## Known Issues

KI-036 opened — an inferred, unverified `growth_series` per-point type shape (low severity; no component consumed it yet, since it's always empty in practice per KI-021). KI-010 (frontend `.gitattributes` line-ending rules) was resolved, not introduced, by this milestone.

## Lessons Learned

This Next.js version's own bundled `AGENTS.md`/`docs/` warning — read before writing any App Router code, not after hitting an error — paid off directly twice (the `unstable_retry` prop shape, the documented flash-prevention pattern), extending the "consult the source, not memory" discipline the M3 design review established for the Founder Specification to a fast-moving framework dependency. Separately: when a fake-transport test technique produces a surprising result, the more robust fix is usually to test the pure logic directly rather than debug deeper into a third-party library's internals — matching this project's existing backend-test-suite preference for isolating pure functions from their I/O boundary specifically so they're testable without simulating the boundary at all.

## Recommended Next Phase

M7 Phase 2 — Product Screens, starting with the Simulator → Results flow. Two items flagged for resolution before or alongside that specific screen: `growth_series`/`disclosed_splits` persistence (KI-021/FD-008) and the anonymous-AI rate-limit specifics (FD-009/010). (A hardening pass, M7 Phase 1.5, was inserted before Phase 2 began — see `M7_PHASE_1_5_REPORT.md`.)
