# PROJECT_STATE.md

The project's dashboard. Unlike DEVLOG/CHANGELOG/KNOWN_ISSUES (append-only journals),
this document is **overwritten** each time it's updated — it reflects current state,
not history. History lives in the other required documents; this one just points to it.

---

## Current Version

**0.11.0** (per `docs/CHANGELOG.md`; not yet tagged — tagging is a founder git action, not performed by this pass). Two founder-approved decisions implemented in the working tree: **Founder Decision 016** (CAGR percentage-scale correction, source fix + `calculation_version` "v2" + immediate backfill) and **Founder Decision 017** (Results Opening Sequence: the staged composing→pause→reveal timeline rejected and removed; the surrounding editorial components from M7 Phase 3B.1/3B.2 kept). This resolves both items that had the completed-simulation Results screen blocked as of the prior (2026-07-21) reconciliation pass — the `results/pending-founder-review` branch's content is now folded into `main` (confirmed an ancestor of `main`, per that pass's own doc-only merge), and this pass's amendment on top of it removes the specific pattern the founder ruled against.

## Current Milestone

**M7 Phase 3B.1/3B.2 + CAGR correction — Complete.** The Results screen (worked-example hero + seven-section editorial reading order) renders immediately on data arrival, with at most one ~200ms settle transition, fully reduced-motion-aware, no skip affordance (`docs/ARCHITECTURE_DECISIONS.md` ADR-041). `cagr_percentage` is calculated, stored, and served correctly at percentage scale (ADR-040), with every pre-existing `completed` row backfilled. Full detail in `docs/DEVLOG.md`'s latest entry.

## Repository Health Score

**8/10** — unchanged. This pass closed both items the prior pass had flagged as open judgment calls (a High-severity financial-correctness defect, and a BORDERLINE motion-philosophy finding) rather than leaving either open indefinitely — the same verification discipline this project has applied at every milestone (KI-043, ADR-037, the M7 Phase 3B.1 `inline-block` bug) extended to a live, real-backend confirmation of the CAGR fix specifically (a seeded AAPL simulation reproducing KI-045's exact cited scenario, now showing a correct, sane CAGR).

## Production Readiness Score

**~5/10 for the platform overall**, unchanged — this pass fixes a real, previously-shipped-adjacent defect and amends an interaction pattern before it ever reached production, rather than introducing new backend surface. KI-016 and KI-039 remain the two items most load-bearing for an actual launch decision.

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
| M7 Phase 3B.1 | 0.10.1 | 2026-07-20 | Results Opening Sequence (original build) — the animated bridge from the Simulator to a completed Results screen (`?new=1` marker, ADR-038), replacing `SimulationForm`'s inline success card with direct navigation. **Its staged timeline was subsequently rejected — see 0.11.0.** |
| M7 Phase 3B.2 | 0.10.2 | 2026-07-20 | Results Reading Experience — redesigned the completed Results screen from a KPI-card dashboard to a fixed seven-section editorial reading order (ADR-039), with an honest "not yet available" growth-chart placeholder pending KI-021 |
| Review/reconciliation pass | — | 2026-07-21 | KI-045 (CAGR percentage-scale defect) discovered and documented; Founder Decision 016 drafted; `v0.10.0` tagged retroactively; 3B.1/3B.2 parked on `results/pending-founder-review` pending founder review of KI-045 and a motion-philosophy BORDERLINE finding on the Opening Sequence timeline |
| CAGR fix + Opening Sequence amendment | 0.11.0 | 2026-07-22 | Founder Decision 016 approved and implemented (`calculate_cagr` now percentage-scaled, `calculation_version` "v2", immediate backfill, ADR-040); Founder Decision 017 approved and implemented (staged composing→pause→reveal timeline removed, `useSettleIn` single ~200ms settle, `?new=1` mechanism retired, ADR-041) |

*(Milestone dates as recorded in `docs/DEVLOG.md`; note these predate the current system date and reflect the project's own internal timeline.)*

## Next Milestone

**M7 Phase 3C — Results Experience (full)**, now scoped precisely by M7 Phase 3B.2's `GrowthOverTime` placeholder (ADR-039): replace its "not yet available" empty-state branch with a real chart once `growth_series` actually has data, plus composition/splits disclosure and any remaining Results-screen depth. **Not started; no longer blocked by KI-045 or the motion-philosophy finding — both resolved this pass.** Two remaining prerequisites, precisely tracked: (1) Founder Decision 014's `growth_series` persistence mechanism (Option A — approved 2026-07-19, not yet implemented) must actually be built before the growth chart can show real data on a retrieval-after-creation `GET`, not only on the immediate `POST` response — KI-021 tracks this, still open. (2) Founder Decision 015's anonymous/authenticated AI rate-limit specifics (Option D — approved 2026-07-19, not yet implemented) must be built before M7 Phase 4's AI panel can design its limit-reached state. (3) KI-039's custom-domain requirement must be resolved before the *first deployed staging or demo environment* (High severity) — does not block local development. See "M7 Frontend Roadmap" below for the full phase sequence. Asset Explorer, Simulation History, and Auth screens remain unbuilt and are candidates for near-term follow-on phases after the Results Experience is complete.

## M7 Frontend Roadmap

The frontend milestone (M7) is being delivered in sequenced phases rather than as one large build, per this project's established design-review-then-implement pattern. Full detail for each completed phase is in `docs/MILESTONE_REPORTS/`.

| Phase | Purpose | Status | Summary | Depends on |
|---|---|---|---|---|
| **M7 Phase 0** — Brand & Design Foundation | Establish the visual identity and brand philosophy before any code is written | ✅ Complete (`M7_PHASE_0_REPORT.md`) | `docs/BRAND_CONSTITUTION.md`, Founder Decision 004 (FD-004–012) | M6 complete (backend stable) |
| **M7 Phase 1** — Frontend Foundation | Scaffold the frontend: design tokens, theming, shared providers, the API client, primitive components | ✅ Complete (`M7_PHASE_1_REPORT.md`) | Next.js 16.2 scaffolded; CSS-variable token architecture bridged into Tailwind v4; light/dark theming; centralized API client; 8 primitive components; 42 tests | M7 Phase 0 approved |
| **M7 Phase 1.5** — Foundation Hardening | Verify Phase 1's foundation against ground truth rather than assume it correct | ✅ Complete (`M7_PHASE_1_5_REPORT.md`) | Found and fixed a real WCAG contrast bug and a CSS self-reference bug (ADR-028), found and fixed real API-contract drift (ADR-030), added the financial-formatting guardrail (ADR-029) and query conventions (ADR-032); 61 new tests (103 total) | M7 Phase 1 complete |
| **M7 Phase 2** — Simulator Experience | Build the platform's first product screen: collect, validate, and submit a historical simulation | ✅ Complete, awaiting founder sign-off (`M7_PHASE_2_REPORT.md`) | 7 foundation gaps closed (ADR-033/034), the Simulator screen built, `dev_seed` ingestion mitigation (ADR-035, KI-044), trading-day UX guidance, final polish (technical-details disclosure, asset info panel, trust indicators); 150 tests | M7 Phase 1.5 complete |
| **M7 Phase 3B** — Founder Decisions + Results Foundation | Formalize FD-013/014/015; build the non-chart Results foundation (route, fetch, status-aware rendering, hero numbers, snapshot, technical details) | ✅ Complete, tagged `v0.10.0` | `docs/FOUNDER_DECISIONS.md` FD-013/014/015, `/simulation/[id]`, `calculation_version` exposure (ADR-036), `StatTile` compact variant (ADR-037); 15 new frontend tests + 2 backend assertions | Phase 2 implementation complete |
| **M7 Phase 3B.1** — Results Opening Sequence | The worked-example hero bridging the Simulator to a completed Results screen | ✅ Complete, **amended by Founder Decision 017** | `OpeningSequenceHeading`, `useSettleIn` (replaces `useOpeningSequence`), `useReducedMotion`; renders immediately with at most one ~200ms settle transition, no `?new=1` marker (ADR-038 superseded by ADR-041) | Phase 3B complete |
| **M7 Phase 3B.2** — Results Reading Experience | Redesign the completed Results screen from a KPI dashboard to a fixed editorial reading order | ✅ Complete | `results-sections.tsx` (Supporting Facts / Growth Over Time / Why / The Proof), ADR-039 — unmodified by Founder Decision 017 | Phase 3B.1 complete |
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
- **Founder Decision 016** (Approved, 2026-07-22) — CAGR Percentage Scale Correction, Option 1a: fix at the source (`calculate_cagr` now percentage-scaled), `calculation_version` bumped to "v2", every existing `completed` row backfilled. Closed — implemented in full this pass; see ADR-040.
- **Founder Decision 017** (Approved, 2026-07-22) — Results Opening Sequence: the staged composing→pause→reveal timeline rejected; the surrounding editorial components (ADR-039) kept. Closed — implemented in full this pass; see ADR-041.

## Open ADRs

All of ADR-001 through ADR-037, ADR-039, ADR-040, and ADR-041 are **Accepted**. One carries a pending-review qualifier:
- **ADR-008** (Economic Indicators two-table design) — Accepted, but flagged "Pending Founder Review" per KI-005.

**ADR-038** (the `?new=1` replay-gate mechanism) is **Superseded by ADR-041** — the mechanism it documented no longer exists, per Founder Decision 017.

No ADR is currently in Proposed/Draft state. New this pass: **ADR-040** (CAGR percentage-scale fix — `calculation_version` "v2", backfill design, the `NUMERIC(10,6)` overflow bound check) and **ADR-041** (removing the staged opening-sequence timeline — `useSettleIn`, retiring the `?new=1` marker). Prior phase: **ADR-039** (the Results Reading Experience). Earlier: **ADR-036** (`calculation_version` exposed on `SimulationResponse`) and **ADR-037** (Results foundation page structure plus the `StatTile` compact-size fix).

## Critical Known Issues

- **KI-016 (High, Open)** — Split-consistency assumption underlying `close_price`-based calculation unverified against live data. The single highest-priority *long-standing* open item in the project, unrelated to M6 or M7.
- **KI-039 (High, Open)** — Custom-domain requirement for `SameSite=Strict` cookies to function at all (ADR-018's own assumption) is never enforced or verified anywhere — breaks the first *staging/demo* deployment, not only production, if frontend and backend ship on default Vercel/Railway/Render subdomains. Deadline: before the first deployed staging/demo environment.
- **KI-021 (Medium, Open — reopened 2026-07-19)** — `growth_series`/`disclosed_splits` still not persisted (empty on retrieval-after-creation); Founder Decision 014 approves the full-resolution mechanism (Option A), but implementation is scheduled for M7 Phase 3C, not yet built. Blocking the growth chart specifically, not the Results foundation (which does not read this field).
- **KI-031 (Medium, Open)** — Password reset / account recovery not implemented — deliberately deferred past M5, but a real requirement before any production launch per `.claude/SECURITY_POLICY.md`.
- **KI-032 (Medium, Open)** — M6's numeric-integrity/advice-language safety checks are heuristic, not exhaustive — the most consequential open item from the Educational AI System milestone.
- **KI-003 (Medium, Open)** — API Architecture (`.claude/API_STANDARDS.md`) is provisional, pending founder approval.
- **KI-004 / KI-005 (Low/Medium, Open)** — Derived ERD and Economic Indicators two-table design, both pending founder review.

**KI-045 (High) — Resolved this pass.** `cagr_percentage` was served at 1/100th its correct value; fixed at the source, backfilled, and live-verified (a seeded AAPL simulation reproducing the originally-cited scenario now shows a correct +14.69% CAGR alongside +73.05% Total Return). See `docs/KNOWN_ISSUES.md` KI-045 for the full resolution record.

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

Resolved recently (kept here briefly for continuity, full detail in `docs/KNOWN_ISSUES.md`): KI-043 (a stale asset-selection display in `AssetSearchCombobox` surviving the Simulator's "Start a new simulation" reset — found and fixed within the same phase it was introduced, M7 Phase 2 increment 1); KI-045 (CAGR percentage-scale defect, resolved this pass).

None of these are undocumented shortcuts — all tracked per the Technical Debt Policy in `.claude/REVIEW_CHECKLIST.md`.

## Current Branch

`main`

## Last Updated

2026-07-22 — **Founder Decision 016 (CAGR fix) and Founder Decision 017 (Opening Sequence ruling), both approved and implemented.** Two independent changes, delivered in the same pass:

(1) **CAGR percentage-scale correction (KI-045 resolved).** `backend/app/simulation/formulas.py::calculate_cagr` now multiplies by 100, matching `calculate_total_return_percent`'s existing convention. `DEFAULT_CALCULATION_VERSION` bumped `"v1"` → `"v2"`; the two versions' semantics documented in `docs/simulation_formulas.md` §4a and `docs/ARCHITECTURE_DECISIONS.md` ADR-040. A new Alembic migration (`0004_cagr_percentage_v2_backfill.py`) rescales every existing `completed`, `"v1"` simulation's stored `cagr_percentage` by ×100 and re-stamps it to `"v2"`, with a logged, non-destructive carve-out for any row a lossless rescale would overflow `NUMERIC(10,6)` on (none matched against this platform's real data). The known-answer test now independently hand-derives its expected value (`9.594448`, shown in-line) rather than asserting the pre-fix raw fraction; `docs/api_design.md`'s worked example corrected to match. Live-verified end to end: seeded AAPL data via `dev_seed`, created a real simulation through the running API reproducing KI-045's exact cited scenario ($10,000 → $17,305 over 2020-01-02–2024-01-02), and confirmed the API now returns `"total_return_percentage": "73.050000"` alongside `"cagr_percentage": "14.694581"`, `"calculation_version": "v2"` — both on `POST` and a subsequent `GET`. The pre-existing live database row cited in KI-045 itself was also confirmed correctly backfilled (14.6885%, matching the issue's stated "+14.69%").

(2) **Results Opening Sequence: staged timeline rejected, editorial components kept.** The M7 Phase 3B.1 composing→pause→reveal timeline (`useOpeningSequence`, the `?new=1` replay marker, the "Skip" button) is removed in full. The Results page's worked-example sentence and every supporting section now render immediately on data arrival; the only motion permitted is a single ~200ms ease-in opacity/translate settle on the sentence (`useSettleIn`, replacing `useOpeningSequence`), evaluated once at mount, fully disabled under `prefers-reduced-motion`. `useJustCreatedFlag` and its `?new=1` mechanism are removed entirely (no longer serve any purpose once there's no timeline to gate), along with the `Suspense` boundary that existed only to support the `useSearchParams` call inside it, and the temporary dev-only opening-sequence preview route. M7 Phase 3B.2's editorial redesign (ADR-039) is entirely unmodified. Documented as Founder Decision 017 and `docs/ARCHITECTURE_DECISIONS.md` ADR-041 (which also marks ADR-038 Superseded).

Both changes: full backend (278/278) and frontend (176/176, 4 gracefully skipped) test suites green, zero lint/typecheck errors on both stacks, production build verified. This document itself also resolves three pre-existing unresolved git-merge-conflict-marker defects (in this file, `docs/CHANGELOG.md`, and `docs/DEVLOG.md`) left over from the prior pass's merge of `results/pending-founder-review` into `main` — content from both sides was reconciled in place, nothing was deleted.

Prior entry (2026-07-21): **Review, fix-investigation, philosophy audit, and reconciliation pass.** KI-045 discovered and documented (root-caused, not yet fixed); the Opening Sequence's ~2.75s timeline audited and flagged BORDERLINE against `docs/EXPERIENCE_CONSTITUTION.md`; `v0.10.0` tagged retroactively; the M7 Phase 3B.1/3B.2 changeset parked on `results/pending-founder-review` pending both findings above — both now resolved by this pass's entry.

Prior entry (2026-07-20, M7 Phase 3B.2): **Results Reading Experience, complete.** Redesigned the completed-simulation Results screen from M7 Phase 3B's KPI-card dashboard layout to a fixed, seven-section editorial reading order, on direct instruction. `OpeningSequenceHeading` (Sections 1–2) restyled, not rebuilt; four new presentational components (`results-sections.tsx`) implement Sections 4–7. Full reasoning in ADR-039.

Prior entry (2026-07-20, M7 Phase 3B.1): **Results Opening Sequence, complete (original build; its timeline subsequently rejected — see 2026-07-22 above).** `SimulationForm` navigated to `/simulation/{id}?new=1` on a completed result; the Results screen's `completed` branch rendered a composing→pause→reveal sequence before settling into the permanent heading.

Prior entry (2026-07-19): **M7 Phase 3B: Founder Decisions + Results Foundation, complete.** Formalized Founder Decisions 013, 014, and 015. Built `/simulation/[id]`, the frontend's first dynamic route and the Results screen's non-chart foundation. Exposed `calculation_version` on `SimulationResponse` (ADR-036). Found and fixed a real layout defect (`StatTile` overflow, ADR-037).

Prior entry (2026-07-18): Created `docs/EXPERIENCE_CONSTITUTION.md`, the product's highest-level UX/interaction philosophy, documentation-only. Introduces a three-layer experience model and a complete Founder Decision 013 proposal, formalized in the 2026-07-19 entry.

Prior entry (2026-07-18, M7 Phase 2 Final Polish & Closure): the last implementation pass before M7 Phase 2 is permanently closed. Moved Request ID/error code behind a "Technical details" disclosure; calmed success-state copy; added an asset information panel and trust indicators. **M7 Phase 2 is now permanently closed from an implementation standpoint, awaiting founder sign-off.**

Prior entry (2026-07-18, M7 Phase 2 Final UX Polish, 0.9.2): added calm, educational trading-day guidance beneath the Simulator's date inputs and rewrote `ERROR_COPY.MISSING_HISTORICAL_DATA` to the same educational framing. Created the M7 milestone report series and the M7 Frontend Roadmap (above) for the first time.

Earlier entries (2026-07-18): the Ingestion Reliability fix (0.9.1, `DevSeedProvider`/ADR-035/KI-044) and M7 Phase 2's first increment (0.9.0, seven foundation gaps closed then the Simulator itself built, including the self-caught KI-043 fix).
