# PROJECT_STATE.md

The project's dashboard. Unlike DEVLOG/CHANGELOG/KNOWN_ISSUES (append-only journals),
this document is **overwritten** each time it's updated — it reflects current state,
not history. History lives in the other required documents; this one just points to it.

---

## Current Version

**0.9.2** (per `docs/CHANGELOG.md` — M7 Phase 2 Final UX Polish: Trading-Day Guidance + Educational Error Copy)

## Current Milestone

**M7 Phase 2 — Simulator Experience: Complete, pending founder review.** Full detail in `docs/MILESTONE_REPORTS/M7_PHASE_2_REPORT.md`. Three passes, all 2026-07-18:

1. **Punch-List Fixes + Simulator (0.9.0)**: seven pre-build foundation gaps closed (crash-boundary digest color, production env fallback, `compareDecimalStrings` guardrail/ADR-033, a token self-reference regression test, expanded financial-math guardrail scope, Axios timeout/`AbortSignal` cancellation, breakpoint namespace lock/ADR-034), then the Simulator itself was built: asset search, investment amount, date range, dividend/inflation toggles, full client-side validation plus a pre-submit availability check, and an inline (no-navigation) success state, calling `POST /api/v1/simulations` and never calculating a financial value itself. A real, self-caught bug (stale combobox display text surviving a form reset, KI-043) was found and fixed within this same pass.
2. **Ingestion Reliability: `dev_seed` Fixture Provider (0.9.1)**: with the Simulator reaching a live local backend, manual testing needed real asset/price data, but `yfinance==0.2.44` was failing for every symbol tried. Root-caused via yfinance's own debug mode (not guessed) to Yahoo rate-limiting yfinance's crumb-negotiation endpoint (KI-044) — confirmed neither a Docker networking issue nor a wholesale IP block. Mitigated via `DevSeedProvider` (ADR-035): a small, deterministic, clearly-synthetic local fixture going through the unmodified ingestion pipeline, guarded against running outside development/test.
3. **Final UX Polish (0.9.2)**: at direct founder instruction, added calm trading-day guidance near the date inputs (stocks/ETFs have no weekend/holiday price data; dates are never moved automatically) and rewrote `MISSING_HISTORICAL_DATA`'s error copy to be educational rather than terse — no backend behavior changed, no date-adjustment/trading-calendar logic added anywhere.

**Awaiting**: founder approval of M7 Phase 2 before M7 Phase 3 (Results Experience) begins — explicitly not started per direct instruction.

## Repository Health Score

**8/10** — unchanged in headline number. The Simulator increment repeated Phase 1.5's core lesson (build the verification, don't just assert it isn't needed) at a smaller scale: the "Start a new simulation" reset flow was self-reviewed after the rest of the Simulator was already passing its own tests, and that review caught a real, if minor, UX-correctness bug (stale asset-selection text) before it shipped, fixed in the same pass rather than carried forward. The immediately-following ingestion fix reinforced the same discipline once more: a destructive database cleanup was proposed only after verifying (read-only) exactly what data was at risk, and executed only after explicit user sign-off rather than being assumed safe.

## Production Readiness Score

**~5/10 for the platform overall**, unchanged by this phase's own scope — the platform now has its first real product-facing screen, which is a genuine step toward production-facing, but the Results screen, Asset Explorer, Simulation History, and Auth screens remain unbuilt, and none of this phase's work touches KI-016 or KI-039, still the two items most load-bearing for an actual launch decision.

## Completed Milestones

| Milestone | Version | Date | Summary |
|---|---|---|---|
| M0 | 0.1.0 | 2026-07-02 | Repository & Environment Foundation |
| M1 | 0.2.0 | 2026-07-05 | Database Schema & Migrations |
| Hygiene pass | 0.2.1 | 2026-07-06 | Line endings, stray nested `.git` removed |
| CI reliability fix | 0.2.2 | 2026-07-07 | gitleaks CLI replacing flaky wrapper action |
| M2 | 0.3.0 | 2026-07-07 | Historical Data Ingestion Pipeline |
| M3 design review | 0.3.1 | 2026-07-08 | Founder Decision 001 (`close_price`, not `adjusted_close_price`) |
| M3 | 0.4.0 | 2026-07-09 | Simulation Engine |
| M4 | 0.5.0 | 2026-07-10 | API Layer |
| M4 follow-up | 0.5.1 | 2026-07-10 | Simulation audit logging (KI-026) |
| M5 design review | — | 2026-07-04 | Identity Management design review (approved) |
| M5 | 0.6.0 | 2026-07-11 | Identity Management (Authentication) |
| M6 design review | — | 2026-07-04 | Educational AI System design review (approved, Founder Decision 003) |
| M6 | 0.7.0 | 2026-07-12 | Educational AI System (Explanation Engine + Financial Tutor) |
| M7 Phase 0 | 0.7.1 | 2026-07-13 | Design Foundation — Brand Constitution (`docs/BRAND_CONSTITUTION.md`) |
| M7 Phase 0 follow-up | 0.7.2 | 2026-07-14 | Founder Decision 004 formalized in `docs/FOUNDER_DECISIONS.md` |
| M7 Phase 1 | 0.8.0 | 2026-07-15 | Frontend Foundation — tokens, theme, providers, API client, primitives |
| M7 Phase 1.5 | 0.8.1 | 2026-07-16 | Frontend Foundation Hardening — contrast/self-reference fix, contract drift fix, formatting guardrail, query conventions |
| M7 Phase 2 (increment 1) | 0.9.0 | 2026-07-18 | Punch-List Fixes + Simulator — decimal-comparison guardrail, expanded financial-math guardrail scope, breakpoint namespace lock, Axios timeout/cancellation, the Simulator screen |
| Ingestion reliability fix | 0.9.1 | 2026-07-18 | `dev_seed` fixture provider (ADR-035) unblocking manual testing after yfinance crumb-endpoint rate-limiting (KI-044) |
| M7 Phase 2 final UX polish | 0.9.2 | 2026-07-18 | Trading-day guidance + educational `MISSING_HISTORICAL_DATA` error copy; M7 Phase 2 complete pending founder review |

*(Milestone dates as recorded in `docs/DEVLOG.md`; note these predate the current system date and reflect the project's own internal timeline.)*

## Next Milestone

**M7 Phase 3 — Results Experience**, the other half of the "simulate-and-explain loop" the Simulator now feeds. **Not started — awaiting founder approval of M7 Phase 2 before continuing**, per direct instruction. Three prerequisites carried forward unchanged from the prior entry: (1) `growth_series`/`disclosed_splits` persistence (KI-021/FD-008) should land before or alongside the Results screen specifically, and the Results screen must handle `status !== 'completed'` (nullable fields, `error_message`) as a real, designed case per KI-038 — the Simulator's own success card already models this pattern narrowly (rendering `error_message` for a `failed` simulation) but the Results screen is where it matters in full; (2) the anonymous-AI rate-limit specifics (FD-009/010) should be confirmed before the AI panel's limit-reached state is designed; (3) KI-039's custom-domain requirement must be resolved before the *first deployed staging or demo environment*, not only before production (High severity) — though it does not block further development work itself, which continues locally. See "M7 Frontend Roadmap" below for the full phase sequence. Asset Explorer, Simulation History, and Auth screens remain unbuilt and are candidates for near-term follow-on phases after Results.

## M7 Frontend Roadmap

The frontend milestone (M7) is being delivered in sequenced phases rather than as one large build, per this project's established design-review-then-implement pattern. Full detail for each completed phase is in `docs/MILESTONE_REPORTS/`.

| Phase | Purpose | Status | Summary | Depends on |
|---|---|---|---|---|
| **M7 Phase 0** — Brand & Design Foundation | Establish the visual identity and brand philosophy before any code is written | ✅ Complete (`M7_PHASE_0_REPORT.md`) | `docs/BRAND_CONSTITUTION.md`, Founder Decision 004 (FD-004–012) | M6 complete (backend stable) |
| **M7 Phase 1** — Frontend Foundation | Scaffold the frontend: design tokens, theming, shared providers, the API client, primitive components | ✅ Complete (`M7_PHASE_1_REPORT.md`) | Next.js 16.2 scaffolded; CSS-variable token architecture bridged into Tailwind v4; light/dark theming; centralized API client; 8 primitive components; 42 tests | M7 Phase 0 approved |
| **M7 Phase 1.5** — Foundation Hardening | Verify Phase 1's foundation against ground truth rather than assume it correct | ✅ Complete (`M7_PHASE_1_5_REPORT.md`) | Found and fixed a real WCAG contrast bug and a CSS self-reference bug (ADR-028), found and fixed real API-contract drift (ADR-030), added the financial-formatting guardrail (ADR-029) and query conventions (ADR-032); 61 new tests (103 total) | M7 Phase 1 complete |
| **M7 Phase 2** — Simulator Experience | Build the platform's first product screen: collect, validate, and submit a historical simulation | ✅ Complete, pending founder review (`M7_PHASE_2_REPORT.md`) | 7 more foundation gaps closed (ADR-033/034), the Simulator screen built, `dev_seed` ingestion mitigation (ADR-035, KI-044), trading-day UX guidance; 145 tests | M7 Phase 1.5 complete |
| **M7 Phase 3** — Results Experience (Next) | Display a completed simulation's results: hero stat tiles, growth chart, splits/dividend disclosure | ⏳ Not started — awaiting founder approval of Phase 2 | — | `growth_series`/`disclosed_splits` persistence (KI-021/FD-008); Phase 2 approved |
| **M7 Phase 4** — Educational AI Experience | Surface the backend's existing Explanation Engine/Financial Tutor in the frontend (AI panel, disclaimer, tutor chat) | ⏳ Not started | — | Phase 3 complete (AI panel appears on the Results screen); anonymous-AI rate-limit specifics confirmed (FD-009/010) |
| **M7 Phase 5** — Polish, Accessibility & Responsive Design | A full accessibility/responsive QA pass across every built screen, treated as a literal checklist against `docs/frontend_design_system.md` §11–12, not a vibe check | ⏳ Not started | — | Phases 0–4 complete (nothing to polish before it exists) |

Asset Explorer, Simulation History, and Auth screens are named in `docs/frontend_design_system.md` §13's page inventory but not yet assigned to a specific numbered phase above — candidates for a near-term follow-on phase after Results, per the same document's suggested build sequencing.

## Open Founder Decisions

- **Founder Decision 001** (Approved, 2026-07-08) — Simulation Engine uses `close_price`, not `adjusted_close_price`. Closed.
- **Founder Decision 002** (Approved, 2026-07-11) — Identity Management: token/cookie/lockout/role/lifecycle model. Closed — implemented in full at M5.
- **Founder Decision 003** (Approved, 2026-07-12) — Educational AI System: renamed from "AI Analyst," scope (Explanation Engine + Financial Tutor only), provider (Anthropic first, `NullProvider` fallback), privacy allowlist, caching/cost-control rules, and the AI integrity check. Closed — implemented in full at M6.
- **Founder Decision 004** (Approved, 2026-07-13) — M7 Design Foundation: visual design system approval, theme architecture, M7 scope exclusions (Asset Comparison/Report Generation), minimal Account/Settings scope, growth-chart consistency as a backend precondition (KI-021 reclassified), anonymous educational AI access and its rate-limit protection principle, and the brand philosophy (trust/education over excitement, confidence without ego). Closed — full reasoning in `docs/BRAND_CONSTITUTION.md` §3.

No Founder Decisions currently awaiting approval.

## Open ADRs

All of ADR-001 through ADR-035 are **Accepted**. One carries a pending-review qualifier:
- **ADR-008** (Economic Indicators two-table design) — Accepted, but flagged "Pending Founder Review" per KI-005.

No ADR is currently in Proposed/Draft state. New this pass: **ADR-035** (`DevSeedProvider` — a local-development-only fixture provider, explicitly not a fix to Yahoo's yfinance rate limiting). Prior phase: **ADR-033** (`compareDecimalStrings` helper + ESLint ban on bare relational operators on financial values, guardrail scope expanded to `hooks`/`providers`/`lib`) and **ADR-034** (Tailwind breakpoint namespace reset-then-redeclare, locking the three approved breakpoints).

## Critical Known Issues

- **KI-016 (High, Open)** — Split-consistency assumption underlying `close_price`-based calculation unverified against live data. The single highest-priority open item in the project, unrelated to M6 or M7.
- **KI-039 (High, Open)** — Custom-domain requirement for `SameSite=Strict` cookies to function at all (ADR-018's own assumption) is never enforced or verified anywhere — breaks the first *staging/demo* deployment, not only production, if frontend and backend ship on default Vercel/Railway/Render subdomains. Deadline: before the first deployed staging/demo environment. Found during M7 Phase 1.5, unaffected by this phase's work (no deployment configuration changed).
- **KI-031 (Medium, Open)** — Password reset / account recovery not implemented — deliberately deferred past M5, but a real requirement before any production launch per `.claude/SECURITY_POLICY.md`.
- **KI-032 (Medium, Open)** — M6's numeric-integrity/advice-language safety checks are heuristic, not exhaustive — the most consequential open item from the Educational AI System milestone.
- **KI-003 (Medium, Open)** — API Architecture (`.claude/API_STANDARDS.md`) is provisional, pending founder approval.
- **KI-004 / KI-005 (Low/Medium, Open)** — Derived ERD and Economic Indicators two-table design, both pending founder review.

Full list (44 entries, most resolved) in `docs/KNOWN_ISSUES.md`.

## Technical Debt Summary

- KI-044 — `yfinance==0.2.44`'s crumb-negotiation endpoint gets rate-limited (429) by Yahoo, breaking all yfinance ingestion identically inside and outside Docker; mitigated for local dev via `dev_seed` (ADR-035), not yet fixed at the root (a verified `yfinance` version bump, plus retry/backoff — relates to KI-015).
- KI-033 — Regeneration/follow-up cap-check TOCTOU race under genuine concurrency (low severity, mirrors KI-012/KI-027's precedent).
- KI-034 — Unverified assumption that Anthropic echoes back the exact requested model string, affecting cache efficiency only (not correctness or safety).
- KI-027 — Refresh-token rotation race under genuine concurrency (low severity, mirrors KI-012's precedent).
- KI-028 — Stateless access token cannot be revoked before its 15-minute natural expiry (accepted architectural tradeoff).
- KI-029 — Account-lockout retry-after duration not surfaced to the API client (minor UX gap).
- KI-030 — A deprecated httpx test-only parameter used to work around Secure-cookie/TestClient scheme behavior.
- KI-012 — TOCTOU race in ingestion asset/indicator get-or-create (fine at MVP single-process scale).
- KI-013/014/015 — CoinGecko OHLC fidelity, no ticker→id mapping, no retry/backoff.
- KI-021 — `growth_series`/`disclosed_splits` not persisted (empty on retrieval-after-creation); a blocking prerequisite for the Results screen per FD-008, not a permanent design-around.
- KI-025 — `assets.exchange` returns `null` (no schema column yet).
- KI-039 — Custom-domain requirement for `SameSite=Strict` cookies, unverified, High severity, deadline before first staging/demo deployment (see Critical Known Issues above).
- KI-040 — Theme-flash-prevention inline script's future CSP interaction (nonce vs. hash strategy) — deferred design note; no CSP exists yet.
- KI-042 — `SameSite=Strict`'s external-first-referrer cookie-withholding behavior — Low severity, deliberately accepted, revisit when an authenticated saved-simulation-sharing feature is actually designed.

Resolved recently (kept here briefly for continuity, full detail in `docs/KNOWN_ISSUES.md`): KI-043 (a stale asset-selection display in `AssetSearchCombobox` surviving the Simulator's "Start a new simulation" reset — found and fixed within the same phase it was introduced, M7 Phase 2 increment 1).

None of these are undocumented shortcuts — all tracked per the Technical Debt Policy in `.claude/REVIEW_CHECKLIST.md`.

## Current Branch

`main`

## Last Updated

2026-07-18 — M7 Phase 2 Final UX Polish, at direct founder instruction: added calm, educational trading-day guidance beneath the Simulator's date inputs (stocks/ETFs have no weekend/market-holiday price data; dates are never moved automatically, since historical accuracy matters more than convenience) and rewrote `ERROR_COPY.MISSING_HISTORICAL_DATA` to the same educational framing. No backend behavior changed; no date-adjustment or trading-calendar logic was added anywhere. 145 tests (141 passing, 4 gracefully skipped without a live backend), 93.56%/81.6%/92.7%/95.74% statement/branch/function/line coverage, zero lint/typecheck errors, production build verified. Created the M7 milestone report series (`docs/MILESTONE_REPORTS/M7_PHASE_{0,1,1_5,2}_REPORT.md`) and the M7 Frontend Roadmap (above). **M7 Phase 2 is now considered complete, pending founder review** — M7 Phase 3 has explicitly not been started.

Prior entry (2026-07-18, Ingestion Reliability fix): root-caused (via yfinance's own debug mode, not guesswork) a `yfinance==0.2.44` failure to Yahoo rate-limiting its crumb-negotiation endpoint (KI-044), confirmed via direct testing it is neither a Docker networking issue nor a wholesale IP block. Added `DevSeedProvider` (`--provider dev_seed`, ADR-035) — a local-development-only, clearly-synthetic fixture provider that reuses the unmodified ingestion pipeline and refuses to run outside a development/test `ENVIRONMENT`. Verified end-to-end against the seeded AAPL/SPY/BTC-USD data, including a real `POST /api/v1/simulations` call to a completed result.

Earlier entry (2026-07-18, M7 Phase 2's first increment — Punch-List Fixes + Simulator): closed seven pre-Simulator foundation gaps, then built the Simulator — asset search, amount/date/dividend/inflation inputs, full validation, pre-submit availability check, and an inline success state, calling `POST /api/v1/simulations` and never calculating a financial value client-side. Found and fixed one real, self-caught bug (KI-043, stale combobox text after form reset) within the same phase.
