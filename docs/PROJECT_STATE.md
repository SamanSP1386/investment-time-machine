# PROJECT_STATE.md

The project's dashboard. Unlike DEVLOG/CHANGELOG/KNOWN_ISSUES (append-only journals),
this document is **overwritten** each time it's updated — it reflects current state,
not history. History lives in the other required documents; this one just points to it.

---

## Current Version

**0.10.0** (per `docs/CHANGELOG.md` — M7 Phase 3B: Founder Decisions + Results Foundation)

## Current Milestone

**M7 Phase 3B — Founder Decisions + Results Foundation: Complete.** Full detail in `docs/DEVLOG.md`'s 2026-07-19 entry. Two parts:

1. **Founder Decisions formalized**: Founder Decision 013 (Experience Philosophy — approves `docs/EXPERIENCE_CONSTITUTION.md` in full, status flipped from PROPOSED to APPROVED), Founder Decision 014 (Growth Series Persistence, Option A — persist `growth_series` at creation, backfill existing completed simulations, version against `calculation_version`, `GET` must never return an empty series for a completed simulation; **approved as policy, not yet implemented** — KI-021 reopened accordingly), Founder Decision 015 (Anonymous Educational AI Limits, Option D — anonymous keeps no-auth-wall access at a lower per-minute rate plus a new daily cap, authenticated keeps the spec-mandated 20/min at a higher daily cap, friendly non-punitive limit-reached messaging; **approved as policy, not yet implemented** — unblocks M7 Phase 4's AI-panel design).
2. **Results foundation built**: `/simulation/[id]`, the frontend's first dynamic route — loading state, `ErrorState`-rendered fetch errors, status-aware rendering for all three `SimulationStatus` values (`completed`/`pending`/`failed`), a "Simulation Result" header with status badge, a worked-example sentence, a Simulation Snapshot card, three hero `StatTile`s (Final Value/Total Return/CAGR), a collapsed Technical Details disclosure (simulation ID/`calculation_version`/created timestamp), a "Run another simulation" link, and a client-side "Copy link" affordance. Explicitly **not built**: growth chart, composition chart, AI panel, methodology section, table fallback, advanced disclosure system — per direct instruction, these are M7 Phase 3C's scope. A real layout defect (`StatTile` overflowing a three-tile row for a five-figure currency value) was found by live-rendering the page against a real backend-created simulation and fixed in the same pass (`docs/ARCHITECTURE_DECISIONS.md` ADR-037) — not caught by the unit test suite alone. A small, additive backend schema change (`calculation_version` exposed on `SimulationResponse`, ADR-036) was made alongside this, since the technical-details item required a field the backend had never surfaced.

**Verified end-to-end against the live local stack**: a real `completed` simulation, a real `failed` simulation (genuine `MISSING_HISTORICAL_DATA`), and a nonexistent simulation ID were each fetched through the actual running frontend/backend pair and screenshotted with a headless Playwright browser — not simulated or assumed from tests alone.

## Repository Health Score

**8/10** — unchanged in headline number, for the same reason it held at 8 through M7 Phase 2: this pass repeated the project's core verification discipline once more, at a new scale. A real, non-obvious layout bug (`StatTile` overflowing a three-tile hero-number row) was found only by actually rendering the new page against a real backend-created simulation and inspecting a screenshot — the full unit/integration test suite was green the entire time this defect existed, which is itself the point: a passing test suite and a correct live render are not the same claim, and this project keeps re-confirming that distinction rather than assuming it once was enough.

## Production Readiness Score

**~5/10 for the platform overall**, unchanged by this phase's own scope — the platform now has the foundation of its second real product-facing screen, which is a genuine step toward production-facing, but the growth chart, AI panel, Asset Explorer, Simulation History, and Auth screens all remain unbuilt, and none of this phase's work touches KI-016 or KI-039, still the two items most load-bearing for an actual launch decision.

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
| M7 Phase 2 final UX polish | 0.9.2 | 2026-07-18 | Trading-day guidance + educational `MISSING_HISTORICAL_DATA` error copy |
| M7 Phase 2 final polish & closure | 0.9.3 | 2026-07-18 | Technical-details disclosure (`ErrorState`), calmer success copy, asset information panel, understated trust indicators; M7 Phase 2 permanently closed, awaiting founder sign-off |
| M7 Phase 3B | 0.10.0 | 2026-07-19 | Founder Decisions + Results Foundation — Founder Decisions 013/014/015 formalized, `/simulation/[id]` built (no chart/AI panel), `calculation_version` exposed (ADR-036), `StatTile` compact-size fix (ADR-037) |

*(Milestone dates as recorded in `docs/DEVLOG.md`; note these predate the current system date and reflect the project's own internal timeline.)*

## Next Milestone

**M7 Phase 3C — Results Experience (full)**, the growth chart, composition/splits disclosure, and remaining Results-screen depth the 3B foundation was deliberately scoped to exclude. **Not started.** Two prerequisites, now precisely tracked rather than open-ended: (1) Founder Decision 014's `growth_series` persistence mechanism (Option A — approved 2026-07-19, not yet implemented) must actually be built before the growth chart can show real data on a retrieval-after-creation `GET`, not only on the immediate `POST` response — KI-021 is reopened and tracks this. (2) Founder Decision 015's anonymous/authenticated AI rate-limit specifics (Option D — approved 2026-07-19, not yet implemented) must be built before M7 Phase 4's AI panel can design its limit-reached state, per that decision's own stated purpose. (3) KI-039's custom-domain requirement must be resolved before the *first deployed staging or demo environment*, not only before production (High severity) — though it does not block further development work itself, which continues locally. See "M7 Frontend Roadmap" below for the full phase sequence. Asset Explorer, Simulation History, and Auth screens remain unbuilt and are candidates for near-term follow-on phases after the Results Experience is complete.

## M7 Frontend Roadmap

The frontend milestone (M7) is being delivered in sequenced phases rather than as one large build, per this project's established design-review-then-implement pattern. Full detail for each completed phase is in `docs/MILESTONE_REPORTS/`.

| Phase | Purpose | Status | Summary | Depends on |
|---|---|---|---|---|
| **M7 Phase 0** — Brand & Design Foundation | Establish the visual identity and brand philosophy before any code is written | ✅ Complete (`M7_PHASE_0_REPORT.md`) | `docs/BRAND_CONSTITUTION.md`, Founder Decision 004 (FD-004–012) | M6 complete (backend stable) |
| **M7 Phase 1** — Frontend Foundation | Scaffold the frontend: design tokens, theming, shared providers, the API client, primitive components | ✅ Complete (`M7_PHASE_1_REPORT.md`) | Next.js 16.2 scaffolded; CSS-variable token architecture bridged into Tailwind v4; light/dark theming; centralized API client; 8 primitive components; 42 tests | M7 Phase 0 approved |
| **M7 Phase 1.5** — Foundation Hardening | Verify Phase 1's foundation against ground truth rather than assume it correct | ✅ Complete (`M7_PHASE_1_5_REPORT.md`) | Found and fixed a real WCAG contrast bug and a CSS self-reference bug (ADR-028), found and fixed real API-contract drift (ADR-030), added the financial-formatting guardrail (ADR-029) and query conventions (ADR-032); 61 new tests (103 total) | M7 Phase 1 complete |
| **M7 Phase 2** — Simulator Experience | Build the platform's first product screen: collect, validate, and submit a historical simulation | ✅ Complete, awaiting founder sign-off (`M7_PHASE_2_REPORT.md`) | 7 foundation gaps closed (ADR-033/034), the Simulator screen built, `dev_seed` ingestion mitigation (ADR-035, KI-044), trading-day UX guidance, final polish (technical-details disclosure, asset info panel, trust indicators); 150 tests | M7 Phase 1.5 complete |
| **M7 Phase 3B** — Founder Decisions + Results Foundation | Formalize FD-013/014/015; build the non-chart Results foundation (route, fetch, status-aware rendering, hero numbers, snapshot, technical details) | ✅ Complete | `docs/FOUNDER_DECISIONS.md` FD-013/014/015, `/simulation/[id]`, `calculation_version` exposure (ADR-036), `StatTile` compact variant (ADR-037); 15 new frontend tests + 2 backend assertions | Phase 2 implementation complete |
| **M7 Phase 3C** — Results Experience (full) | Growth chart, composition/splits disclosure, remaining Results-screen depth | ⏳ Not started | — | Founder Decision 014's `growth_series` persistence actually implemented (not just approved) |
| **M7 Phase 4** — Educational AI Experience | Surface the backend's existing Explanation Engine/Financial Tutor in the frontend (AI panel, disclaimer, tutor chat) | ⏳ Not started | — | Phase 3C complete (AI panel appears on the Results screen); Founder Decision 015's rate-limit implementation landed |
| **M7 Phase 5** — Polish, Accessibility & Responsive Design | A full accessibility/responsive QA pass across every built screen, treated as a literal checklist against `docs/frontend_design_system.md` §11–12, not a vibe check | ⏳ Not started | — | Phases 0–4 complete (nothing to polish before it exists) |

Asset Explorer, Simulation History, and Auth screens are named in `docs/frontend_design_system.md` §13's page inventory but not yet assigned to a specific numbered phase above — candidates for a near-term follow-on phase after Results, per the same document's suggested build sequencing.

## Open Founder Decisions

- **Founder Decision 001** (Approved, 2026-07-08) — Simulation Engine uses `close_price`, not `adjusted_close_price`. Closed.
- **Founder Decision 002** (Approved, 2026-07-11) — Identity Management: token/cookie/lockout/role/lifecycle model. Closed — implemented in full at M5.
- **Founder Decision 003** (Approved, 2026-07-12) — Educational AI System: renamed from "AI Analyst," scope (Explanation Engine + Financial Tutor only), provider (Anthropic first, `NullProvider` fallback), privacy allowlist, caching/cost-control rules, and the AI integrity check. Closed — implemented in full at M6.
- **Founder Decision 004** (Approved, 2026-07-13) — M7 Design Foundation: visual design system approval, theme architecture, M7 scope exclusions (Asset Comparison/Report Generation), minimal Account/Settings scope, growth-chart consistency as a backend precondition (KI-021 reclassified), anonymous educational AI access and its rate-limit protection principle, and the brand philosophy (trust/education over excitement, confidence without ego). Closed — full reasoning in `docs/BRAND_CONSTITUTION.md` §3.
- **Founder Decision 013** (Approved, 2026-07-19) — Experience Philosophy: approves `docs/EXPERIENCE_CONSTITUTION.md` in full as the product's highest-level UX/interaction philosophy. Closed.
- **Founder Decision 014** (Approved, 2026-07-19) — Growth Series Persistence, Option A: persist `growth_series` at creation, backfill existing completed simulations, version against `calculation_version`. **Approved as policy; implementation not yet built** — tracked as KI-021 (reopened).
- **Founder Decision 015** (Approved, 2026-07-19) — Anonymous Educational AI Limits, Option D: anonymous keeps no-auth-wall access at a lower per-minute rate plus a new daily cap; authenticated keeps the spec-mandated 20/min at a higher daily cap. **Approved as policy; implementation not yet built** — scheduled for M7 Phase 4.

## Open ADRs

All of ADR-001 through ADR-037 are **Accepted**. One carries a pending-review qualifier:
- **ADR-008** (Economic Indicators two-table design) — Accepted, but flagged "Pending Founder Review" per KI-005.

No ADR is currently in Proposed/Draft state. New this pass: **ADR-036** (`calculation_version` exposed on `SimulationResponse`, a small additive schema change) and **ADR-037** (Results foundation page structure — server/client split, status-aware rendering — plus the `StatTile` compact-size fix for a real overflow defect found by live-rendering). Prior phase: **ADR-035** (`DevSeedProvider`), **ADR-033** (`compareDecimalStrings` helper), **ADR-034** (Tailwind breakpoint namespace lock).

## Critical Known Issues

- **KI-016 (High, Open)** — Split-consistency assumption underlying `close_price`-based calculation unverified against live data. The single highest-priority open item in the project, unrelated to M6 or M7.
- **KI-039 (High, Open)** — Custom-domain requirement for `SameSite=Strict` cookies to function at all (ADR-018's own assumption) is never enforced or verified anywhere — breaks the first *staging/demo* deployment, not only production, if frontend and backend ship on default Vercel/Railway/Render subdomains. Deadline: before the first deployed staging/demo environment. Found during M7 Phase 1.5, unaffected by this phase's work (no deployment configuration changed).
- **KI-021 (Medium, Open — reopened 2026-07-19)** — `growth_series`/`disclosed_splits` still not persisted (empty on retrieval-after-creation); Founder Decision 014 approves the full-resolution mechanism (Option A), but implementation is scheduled for M7 Phase 3C, not yet built. Blocking the growth chart specifically, not the Results foundation (which does not read this field).
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
- KI-021 — `growth_series`/`disclosed_splits` not persisted (empty on retrieval-after-creation); Founder Decision 014 approves the fix mechanism (2026-07-19), implementation scheduled for M7 Phase 3C, not yet built. Blocking the growth chart, not the Results foundation.
- KI-025 — `assets.exchange` returns `null` (no schema column yet).
- KI-039 — Custom-domain requirement for `SameSite=Strict` cookies, unverified, High severity, deadline before first staging/demo deployment (see Critical Known Issues above).
- KI-040 — Theme-flash-prevention inline script's future CSP interaction (nonce vs. hash strategy) — deferred design note; no CSP exists yet.
- KI-042 — `SameSite=Strict`'s external-first-referrer cookie-withholding behavior — Low severity, deliberately accepted, revisit when an authenticated saved-simulation-sharing feature is actually designed.

Resolved recently (kept here briefly for continuity, full detail in `docs/KNOWN_ISSUES.md`): KI-043 (a stale asset-selection display in `AssetSearchCombobox` surviving the Simulator's "Start a new simulation" reset — found and fixed within the same phase it was introduced, M7 Phase 2 increment 1).

None of these are undocumented shortcuts — all tracked per the Technical Debt Policy in `.claude/REVIEW_CHECKLIST.md`.

## Current Branch

`main`

## Last Updated

2026-07-19 — **M7 Phase 3B: Founder Decisions + Results Foundation, complete.** Formalized Founder Decisions 013 (Experience Philosophy — approves `docs/EXPERIENCE_CONSTITUTION.md` in full, status flipped from PROPOSED to APPROVED), 014 (Growth Series Persistence, Option A — approved as policy, not yet implemented; KI-021 reopened), and 015 (Anonymous Educational AI Limits, Option D — approved as policy, not yet implemented; unblocks M7 Phase 4). Built `/simulation/[id]`, the frontend's first dynamic route and the Results screen's non-chart foundation: loading state, error state, status-aware rendering (`completed`/`pending`/`failed`), header + worked-example sentence, Simulation Snapshot, three hero `StatTile`s, Technical Details disclosure, "Run another simulation" link, "Copy link" affordance. Explicitly did not build the growth chart, composition chart, AI panel, methodology section, table fallback, or advanced disclosure system, per direct instruction — those are M7 Phase 3C's scope. Exposed `calculation_version` on `SimulationResponse` (ADR-036, a small additive backend schema change required by the technical-details item). Found and fixed a real layout defect (`StatTile` overflowing a three-tile hero-number row for a five-figure currency value) by live-rendering the new page against a real backend-created simulation and screenshotting it with headless Playwright — not caught by the unit test suite, consistent with this project's established verification discipline (ADR-037). 278/278 backend tests passing, 161/162 frontend tests passing (1 gracefully skipped) — 93.87%/81.41%/92.59%/96.16% statement/branch/function/line coverage, zero lint/typecheck errors on both stacks, production build verified, and the full completed/pending/failed/not-found state matrix manually verified end-to-end against the live local stack.

Prior entry (2026-07-18): Created `docs/EXPERIENCE_CONSTITUTION.md`, the product's highest-level UX/interaction philosophy, documentation-only (no frontend code touched, M7 Phase 3 not started). Synthesized from `docs/BRAND_CONSTITUTION.md`, `docs/frontend_design_system.md`, `docs/FOUNDER_DECISIONS.md` (001–004), `docs/PROJECT_STATE.md`, and the shipped M7 Phase 2 Simulator itself as working evidence. Introduces a three-layer experience model (Identity/The Worked Example, Trust/The Proof, Behavior/The Instrument), ten required sections (Purpose through Future Evolution), and a complete, ready-to-formalize Founder Decision 013 proposal at the end — formalized in the entry above.

Prior entry (2026-07-18, M7 Phase 2 Final Polish & Closure): the last implementation pass before M7 Phase 2 is permanently closed. Moved Request ID/error code behind a closed-by-default "Technical details" disclosure on the shared `ErrorState` primitive (also improving the route-level crash boundary and dev playground, which reuse the same component); calmed the success-state copy ("Simulation created" → "Simulation complete"); added an asset information panel (symbol/name/type/availability range, built entirely from data the form already had — no new fetch, no calculation); added understated, non-badge trust indicators near the page heading; reviewed the trading-day guidance wording one final time and confirmed it already covers all three required points, left unchanged. No backend behavior changed, no redesign, no new product feature. 150 tests (149 passing, 1 gracefully skipped), 93.58%/81.68%/92.7%/95.75% statement/branch/function/line coverage, zero lint/typecheck errors, production build verified, and the live local stack re-confirmed working end-to-end (asset search, availability, simulation creation, and the live-rendered `/simulator` HTML all manually checked). Updated the M7 milestone report series and this roadmap to reflect final state. **M7 Phase 2 is now permanently closed from an implementation standpoint, awaiting founder sign-off** — M7 Phase 3 has explicitly not been started.

Prior entry (2026-07-18, M7 Phase 2 Final UX Polish, 0.9.2): added calm, educational trading-day guidance beneath the Simulator's date inputs and rewrote `ERROR_COPY.MISSING_HISTORICAL_DATA` to the same educational framing. Created the M7 milestone report series (`docs/MILESTONE_REPORTS/M7_PHASE_{0,1,1_5,2}_REPORT.md`) and the M7 Frontend Roadmap (above) for the first time.

Earlier entries (2026-07-18): the Ingestion Reliability fix (0.9.1, `DevSeedProvider`/ADR-035/KI-044) and M7 Phase 2's first increment (0.9.0, seven foundation gaps closed then the Simulator itself built, including the self-caught KI-043 fix).
