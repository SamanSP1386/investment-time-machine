# PROJECT_STATE.md

The project's dashboard. Unlike DEVLOG/CHANGELOG/KNOWN_ISSUES (append-only journals),
this document is **overwritten** each time it's updated — it reflects current state,
not history. History lives in the other required documents; this one just points to it.

---

## Current Version

**0.13.0** (per `docs/CHANGELOG.md`; not yet tagged — tagging is a founder git action, not performed by this pass). M7 Phase 3C-3 completes the Results Experience's remaining depth in the working tree: the Growth Chart (a single-hue Recharts line, quiet axes, split-date disclosure, three honest non-crashing states), the full three-paragraph Why explanation, and The Proof's expanded methodology/assumptions/provenance/accessible-data-table — built against the real, persisted `growth_series`/`disclosed_splits` M7 Phase 3C-2 (0.12.0) made available.

## Current Milestone

**M7 Phase 3C-3 — Growth Chart, Why, and The Proof — Complete.** The Results page's reading order (sentence → Supporting Facts → Growth Chart → Why → The Proof) is now fully built, live-verified end to end against the running backend (`docs/ARCHITECTURE_DECISIONS.md` ADR-043). The Results Experience (M7 Phase 3B through 3C-3) is functionally complete, pending founder review. Full detail in `docs/DEVLOG.md`'s latest entry.

## Repository Health Score

**8/10** — unchanged. This pass completed a planned feature build (not a defect fix) while navigating a real architectural tension — a locked charting library's hard requirement for JS numbers against this codebase's strict, test-enforced "never convert a `DecimalString` to a JS number" guardrail — with a disclosed, narrowly-scoped, independently-tested exception (ADR-043) rather than weakening the guardrail itself. The same "state the limitation, don't fabricate a fix" discipline this project has applied throughout (KI-043, ADR-037, KI-045, KI-016) was applied again here: the Why section's originally-specified third dividend state is a disclosed scope gap, not a guessed-at implementation.

## Production Readiness Score

**~5/10 for the platform overall**, unchanged — this pass completes a planned frontend feature rather than closing a production-blocking gap. KI-039 (custom-domain/`SameSite=Strict`) remains the single most load-bearing open item for an actual deployed environment.

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
| M7 Phase 3C-2 | 0.12.0 | 2026-07-23 | Founder Decision 014 implemented in full (`growth_series` persisted at creation, backfilled, read-through on `GET`, ADR-042) — KI-021 resolved; KI-016 live-data verification runbook executed and the split-consistency assumption confirmed — KI-016 resolved |
| M7 Phase 3C-3 | 0.13.0 | 2026-07-24 | Growth Chart, Why, and The Proof built in full (ADR-043) — Recharts line chart with split-marker disclosure, three-paragraph deterministic Why explanation, expanded Methodology/Assumptions/Provenance/accessible data table; the Results Experience (M7 Phase 3B–3C-3) is now functionally complete pending founder review |

*(Milestone dates as recorded in `docs/DEVLOG.md`; note these predate the current system date and reflect the project's own internal timeline.)*

## Next Milestone

**M7 Phase 4 — Educational AI Experience**, surfacing the backend's existing Explanation Engine/Financial Tutor in the frontend (AI panel, disclaimer, tutor chat). The Results Experience (M7 Phase 3B through 3C-3) is now functionally complete — the Growth Chart, Why, and The Proof all built and live-verified this pass — pending founder review, not further backend or frontend prerequisites for the chart itself. Founder Decision 015's anonymous/authenticated AI rate-limit specifics (Option D — approved 2026-07-19, not yet implemented) remain the prerequisite for M7 Phase 4's AI panel to design its limit-reached state. KI-039's custom-domain requirement must be resolved before the *first deployed staging or demo environment* (High severity) — does not block local development. See "M7 Frontend Roadmap" below for the full phase sequence. Asset Explorer, Simulation History, and Auth screens remain unbuilt and are candidates for near-term follow-on phases.

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
| **M7 Phase 3C-2** — Growth Series Persistence (backend) | Implement Founder Decision 014 in full: persist `growth_series`, backfill, read-through on `GET`; execute the KI-016 live-data verification runbook | ✅ Complete (0.12.0) | `simulations.growth_series` JSONB column, `growth_series_codec.py`, `backfill_growth_series.py`, `GET` read-through for `growth_series`/`disclosed_splits` (ADR-042); KI-016 empirically confirmed against real AAPL split data | Founder Decision 014 approved (M7 Phase 3B) |
| **M7 Phase 3C-3** — Growth Chart, Why, The Proof (frontend) | Build the Growth Chart, the full Why explanation, and The Proof's methodology/assumptions/provenance/accessible data table | ✅ Complete (0.13.0) | `growth-chart.tsx`, `chart-plot-value.ts`, `use-asset-detail.ts`, rewritten `results-sections.tsx` (ADR-043); live-verified against the running backend | M7 Phase 3C-2 complete — backend data is ready |
| **M7 Phase 4** — Educational AI Experience | Surface the backend's existing Explanation Engine/Financial Tutor in the frontend (AI panel, disclaimer, tutor chat) | ⏳ Not started | — | Results Experience complete (M7 Phase 3B–3C-3); Founder Decision 015's rate-limit implementation landed |
| **M7 Phase 5** — Polish, Accessibility & Responsive Design | A full accessibility/responsive QA pass across every built screen, treated as a literal checklist against `docs/frontend_design_system.md` §11–12, not a vibe check | ⏳ Not started | — | Phases 0–4 complete (nothing to polish before it exists) |

Asset Explorer, Simulation History, and Auth screens are named in `docs/frontend_design_system.md` §13's page inventory but not yet assigned to a specific numbered phase above — candidates for a near-term follow-on phase after Results, per the same document's suggested build sequencing.

## Open Founder Decisions

- **Founder Decision 001** (Approved, 2026-07-08) — Simulation Engine uses `close_price`, not `adjusted_close_price`. Closed.
- **Founder Decision 002** (Approved, 2026-07-11) — Identity Management: token/cookie/lockout/role/lifecycle model. Closed — implemented in full at M5.
- **Founder Decision 003** (Approved, 2026-07-12) — Educational AI System: renamed from "AI Analyst," scope (Explanation Engine + Financial Tutor only), provider (Anthropic first, `NullProvider` fallback), privacy allowlist, caching/cost-control rules, and the AI integrity check. Closed — implemented in full at M6.
- **Founder Decision 004** (Approved, 2026-07-13) — M7 Design Foundation: visual design system approval, theme architecture, M7 scope exclusions (Asset Comparison/Report Generation), minimal Account/Settings scope, growth-chart consistency as a backend precondition (KI-021 reclassified), anonymous educational AI access and its rate-limit protection principle, and the brand philosophy (trust/education over excitement, confidence without ego). Closed — full reasoning in `docs/BRAND_CONSTITUTION.md` §3.
- **Founder Decision 013** (Approved, 2026-07-19) — Experience Philosophy: approves `docs/EXPERIENCE_CONSTITUTION.md` in full as the product's highest-level UX/interaction philosophy. Closed.
- **Founder Decision 014** (Approved, 2026-07-19) — Growth Series Persistence, Option A: persist `growth_series` at creation, backfill existing completed simulations, version against `calculation_version`. Closed — implemented in full this pass (M7 Phase 3C-2, 0.12.0); see ADR-042. KI-021 resolved.
- **Founder Decision 015** (Approved, 2026-07-19) — Anonymous Educational AI Limits, Option D: anonymous keeps no-auth-wall access at a lower per-minute rate plus a new daily cap; authenticated keeps the spec-mandated 20/min at a higher daily cap. **Approved as policy; implementation not yet built** — scheduled for M7 Phase 4.
- **Founder Decision 016** (Approved, 2026-07-22) — CAGR Percentage Scale Correction, Option 1a: fix at the source (`calculate_cagr` now percentage-scaled), `calculation_version` bumped to "v2", every existing `completed` row backfilled. Closed — implemented in full this pass; see ADR-040.
- **Founder Decision 017** (Approved, 2026-07-22) — Results Opening Sequence: the staged composing→pause→reveal timeline rejected; the surrounding editorial components (ADR-039) kept. Closed — implemented in full this pass; see ADR-041.

## Open ADRs

All of ADR-001 through ADR-037, ADR-039 through ADR-043 are **Accepted**. One carries a pending-review qualifier:
- **ADR-008** (Economic Indicators two-table design) — Accepted, but flagged "Pending Founder Review" per KI-005.

**ADR-038** (the `?new=1` replay-gate mechanism) is **Superseded by ADR-041** — the mechanism it documented no longer exists, per Founder Decision 017.

No ADR is currently in Proposed/Draft state. New this pass: **ADR-043** (the Growth Chart — the disclosed `toChartPlotNumber` numeric-coercion exception, honest reverse-split disclosure, the two-state dividend paragraph, Founder-Decision-017-governed chart motion, the accessible-alternative shape, and the lazy `useAssetDetail` provenance fetch). Prior pass: **ADR-042** (`growth_series` persistence). Earlier: **ADR-040** (CAGR percentage-scale fix), **ADR-041** (removing the staged opening-sequence timeline), **ADR-039** (the Results Reading Experience), **ADR-036** (`calculation_version` exposed on `SimulationResponse`), **ADR-037** (Results foundation page structure plus the `StatTile` compact-size fix).

## Critical Known Issues

- **KI-039 (High, Open)** — Custom-domain requirement for `SameSite=Strict` cookies to function at all (ADR-018's own assumption) is never enforced or verified anywhere — breaks the first *staging/demo* deployment, not only production, if frontend and backend ship on default Vercel/Railway/Render subdomains. Deadline: before the first deployed staging/demo environment. Now the single most load-bearing open item for an actual deployed environment.
- **KI-031 (Medium, Open)** — Password reset / account recovery not implemented — deliberately deferred past M5, but a real requirement before any production launch per `.claude/SECURITY_POLICY.md`.
- **KI-032 (Medium, Open)** — M6's numeric-integrity/advice-language safety checks are heuristic, not exhaustive — the most consequential open item from the Educational AI System milestone.
- **KI-044 (Medium, Open)** — `yfinance==0.2.44`'s crumb-negotiation endpoint remains rate-limited/blocked (reconfirmed this pass, for both AAPL and NVDA), breaking the app's own live yfinance ingestion pipeline; mitigated for local dev via `dev_seed`. Note: this is now a pipeline-reliability issue only — KI-016 (the split-consistency question the pipeline was meant to help verify) is separately resolved via a direct-endpoint data fetch, not blocked by this.
- **KI-003 (Medium, Open)** — API Architecture (`.claude/API_STANDARDS.md`) is provisional, pending founder approval.
- **KI-004 / KI-005 (Low/Medium, Open)** — Derived ERD and Economic Indicators two-table design, both pending founder review.

**KI-021 (Medium) — Resolved this pass.** `growth_series`/`disclosed_splits` are now persisted/read-through correctly: Founder Decision 014 (Option A) implemented in full — new `simulations.growth_series` JSONB column, engine-side persistence at creation, backfill script for pre-existing rows, and a `GET` path that reads through both fields instead of returning them empty. Live-verified: a create-then-`GET` round trip returns byte-identical `growth_series`/`disclosed_splits` to what the original `POST` returned. See `docs/KNOWN_ISSUES.md` KI-021 and `docs/ARCHITECTURE_DECISIONS.md` ADR-042.

**KI-016 (High) — Resolved this pass.** The split-consistency assumption underlying Founder Decision 001 (raw `close_price` is already retroactively split-adjusted within a single fetch) is empirically confirmed against real AAPL 2020-08-31 4-for-1 split data: the fetched close price on 2020-08-28 ($124.8075) exactly matches AAPL's real nominal close that day ($499.23) divided by 4. This was the single highest-priority long-standing open item in the project. See `docs/KNOWN_ISSUES.md` KI-016 for the full record, including the disclosed methodology deviation (the app's own yfinance pipeline remains blocked by KI-044; verification used a direct fetch against the same underlying Yahoo data endpoint).

Full list (46 entries, most resolved) in `docs/KNOWN_ISSUES.md`.

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
- KI-025 — `assets.exchange` returns `null` (no schema column yet).
- KI-039 — Custom-domain requirement for `SameSite=Strict` cookies, unverified, High severity, deadline before first staging/demo deployment (see Critical Known Issues above).
- KI-040 — Theme-flash-prevention inline script's future CSP interaction (nonce vs. hash strategy) — deferred design note; no CSP exists yet.
- KI-042 — `SameSite=Strict`'s external-first-referrer cookie-withholding behavior — Low severity, deliberately accepted, revisit when an authenticated saved-simulation-sharing feature is actually designed.

Resolved recently (kept here briefly for continuity, full detail in `docs/KNOWN_ISSUES.md`): KI-043 (a stale asset-selection display in `AssetSearchCombobox` surviving the Simulator's "Start a new simulation" reset — found and fixed within the same phase it was introduced, M7 Phase 2 increment 1); KI-045 (CAGR percentage-scale defect); KI-021 (`growth_series`/`disclosed_splits` persistence, Founder Decision 014); KI-016 (split-consistency assumption, empirically confirmed) — the latter two resolved this pass.

None of these are undocumented shortcuts — all tracked per the Technical Debt Policy in `.claude/REVIEW_CHECKLIST.md`.

## Current Branch

`main`

## Last Updated

2026-07-24 — **M7 Phase 3C-3: Growth Chart, Why, and The Proof, complete.** The Results Experience's remaining depth, built against the real, persisted `growth_series`/`disclosed_splits` M7 Phase 3C-2 made available:

**Growth Chart.** `growth-chart.tsx` renders a single-hue Recharts line (`--color-chart-portfolio`, identical for a gain or a loss — no red/green moralizing), placed after Supporting Facts and before Why, no card chrome, quiet axes (a few real date ticks on X, no Y-axis tick labels at all). Three honest states beyond the normal case: an empty series (the rare, logged Founder-Decision-014 backfill-skip edge case) renders a calm fallback naming the simulation ID; a single point renders as text plus a dot, never a fabricated line. Split dates are marked subtly on the chart and always disclosed in plain language beneath it, with a reverse split labeled honestly by its raw ratio rather than a fabricated "1-for-N" figure this codebase's financial-math guardrail cannot safely derive. Motion is the same single ~200ms settle already used for the hero sentence — Recharts' own draw-in animation is explicitly disabled, since that staged-reveal pattern is exactly what Founder Decision 017 rejected one milestone earlier, superseding `frontend_design_system.md`'s older, pre-ruling chart-motion language. A real architectural tension surfaced and was resolved with a disclosed, narrowly-scoped exception: Recharts requires JS numbers for plotting geometry, but this codebase's guardrails ban converting a `DecimalString` to a number almost everywhere, including inside a static test that scans `src/lib/format/` itself — the one conversion function (`toChartPlotNumber`) lives deliberately outside that module, with a single, heavily-documented call site, so the guardrail's own guarantee stays unconditionally true. Full reasoning in `docs/ARCHITECTURE_DECISIONS.md` ADR-043.

**Why.** All three paragraphs are now deterministic, template-composed, and live: price appreciation now names the shares purchased; the inflation paragraph is correctly omitted (not filler-texted) when not requested. The dividend paragraph's originally-specified third state ("this asset paid no dividends in this range") is a disclosed scope gap, not a bug — the API exposes no dividend-event signal, and deriving one would require exactly the frontend-side financial arithmetic this codebase's guardrails forbid; the reinvestment case is phrased with an honest "any... if any occurred" hedge instead.

**The Proof.** Methodology and Assumptions are expanded with content sourced directly from `docs/simulation_formulas.md` (the `close_price` policy, the 365.25-day CAGR convention, dividend timing, the CPI as-of lookup). The former Technical Details is renamed Provenance and gains a lazily-fetched "Data source" line (`useAssetDetail`, fetched only once the disclosure is opened). A new Growth chart data subsection renders every point as a real, keyboard-navigable table — the chart's actual text alternative.

Full backend-untouched, frontend-only pass: full test suite green, `eslint`/`tsc` clean, production build clean with `.env.local` moved aside (the KI-046 CI-parity guardrail). Live end-to-end: re-ingested `dev_seed` AAPL data (the dev database was found empty at session start), created a real simulation with dividends and inflation both requested, and rendered the actual, unmocked `SimulationResultClient` tree against the real running backend — confirming the full reading order end to end, including the live CPI-unavailable Why paragraph and the complete real growth-data table. No browser-automation tool was available in this environment, so no pixel-level visual screenshot was captured — stated explicitly, not implied.

Prior entry (2026-07-23): **Founder Decision 014 (Growth Series Persistence) implemented in full; KI-016 live-data verification runbook executed and confirmed.** Two independent pieces of work, delivered in that pass:

(1) **Growth series persistence (KI-021 resolved).** A new nullable `simulations.growth_series` JSONB column (`alembic/versions/0005_growth_series_persistence.py`) is now populated by `run_simulation` at creation for completed simulations, using a new Decimal-safe codec module (`app/simulation/growth_series_codec.py`) that stores every value as a fixed-point string, never a JSON number. `GET /api/v1/simulations/{id}` now reads `growth_series` straight from that column and re-queries `disclosed_splits` fresh from `stock_splits` on every call (no new column needed for splits) — both closing the exact gap KI-021 tracked since M4. A new operator script, `app/simulation/backfill_growth_series.py`, backfills any pre-existing completed row, stamping the recomputed series onto that row's own `calculation_version` (never a newer one), and cleanly skips-and-reports (rather than failing) any row whose underlying price data can no longer support a recompute. Live-verified end to end: two simulations created through the running API (one plain, one with dividends), each confirmed to return byte-identical `growth_series`/`disclosed_splits` between the `POST` response and a subsequent `GET` — the literal closing condition Founder Decision 014 clause 4 requires. A real ORM correctness bug was found and fixed along the way: SQLAlchemy's JSON(B) type silently writes a JSON `null` literal (not SQL `NULL`) for a Python `None` unless `none_as_null=True` is set, which would have broken the backfill script's own selection query. Documented in `docs/ARCHITECTURE_DECISIONS.md` ADR-042.

(2) **KI-016 verification: the split-consistency assumption is confirmed.** Attempted the literal runbook (the app's yfinance ingestion CLI) first; it reproduced KI-044 exactly (crumb endpoint still rate-limited/blocked, confirmed via debug mode, for both AAPL and the NVDA alternate, even after a retry-with-backoff). Since the underlying Yahoo data endpoint itself is reachable without a crumb (the same fact KI-044's own investigation established), fetched real AAPL daily OHLC and split-event data directly from it — a read-only, disclosed methodology deviation, no code changed. Confirmed: AAPL's close price on 2020-08-28 (the last trading day before its 2020-08-31 4-for-1 split) is $124.8075 in the fetched data, an exact match to its real, documented nominal close of $499.23 divided by 4. This is the empirical confirmation Founder Decision 001 has depended on since M3 without live verification — now closed, with no engine code changed (none was warranted; the assumption held).

Both: full backend (288/288) and frontend (179/179, 1 unrelated pre-existing skip) test suites green, zero lint/typecheck errors on both stacks, `ruff`/`black` clean across the full repo. The API contract-drift test ran live against the actual running backend (not its graceful-skip path) and confirmed no frontend type correction was needed.

Prior entry (2026-07-22): **Founder Decision 016 (CAGR fix) and Founder Decision 017 (Opening Sequence ruling), both approved and implemented.** Two independent changes, delivered in that pass:

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
