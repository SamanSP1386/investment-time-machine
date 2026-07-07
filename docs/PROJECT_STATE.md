# PROJECT_STATE.md

The project's dashboard. Unlike DEVLOG/CHANGELOG/KNOWN_ISSUES (append-only journals),
this document is **overwritten** each time it's updated — it reflects current state,
not history. History lives in the other required documents; this one just points to it.

---

## Current Version

**0.8.0** (per `docs/CHANGELOG.md` — M7 Phase 1: Frontend Foundation)

## Current Milestone

**M7 Phase 1 — Frontend Foundation: Complete.** The platform's first frontend code: a Next.js 16 (App Router, TypeScript, Tailwind v4) application scaffolded at `frontend/`, implementing the three-layer design token architecture, light/dark theme switching, the shared provider stack (Theme, TanStack Query, Toast, error boundaries), a centralized Axios API client with typed models and one error-code-to-copy table, and eight primitive components (Button, Input, Card, Badge, Skeleton, EmptyState, ErrorState, StatTile) — all reviewed against `docs/BRAND_CONSTITUTION.md`'s Component Review Checklist. No product pages (Simulator, Results, Auth, Account) exist yet; the root page is a foundation-verification placeholder only, per this phase's own explicit scope boundary.

## Repository Health Score

**8/10** — unchanged. M7 Phase 1 reused the backend's own established discipline (fail-fast config validation, one central error-normalization point, documentation-as-code) rather than inventing new patterns, extending the same positive maintainability signal to the frontend.

## Production Readiness Score

**~5/10 for the platform overall**, unchanged by this phase — the frontend foundation has no product-facing surface yet to move this number; it exists to make Phase 2's screens faster and more consistent to build, not to add readiness on its own. Still held back primarily by KI-016 (unverified split-consistency assumption, the single highest-priority open item) and the still-unbuilt frontend product screens and Deployment milestone. The Educational AI System (M6) remains scored 6/10 (see `docs/MILESTONE_REPORTS/M6_REPORT.md`) — unchanged, not touched by this phase.

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

*(Milestone dates as recorded in `docs/DEVLOG.md`; note these predate the current system date and reflect the project's own internal timeline.)*

## Next Milestone

**M7 Phase 2 — Product Screens**, building on the now-complete frontend foundation: the Simulator → Results flow first (this platform's core "simulate-and-explain loop"), then Asset Explorer, Simulation History, and Auth screens, per `docs/frontend_design_system.md`'s suggested sequencing. Two prerequisites flagged during Phase 1, not yet resolved: (1) `growth_series`/`disclosed_splits` persistence (KI-021/FD-008) should land before or alongside the Results screen specifically; (2) the anonymous-AI rate-limit specifics (FD-009/010) should be confirmed before the AI panel's limit-reached state is designed. Simulation History and Admin Import (`docs/api_design.md`, gated on auth per KI-023) remain unbuilt and are candidates for a near-term follow-on increment.

## Open Founder Decisions

- **Founder Decision 001** (Approved, 2026-07-08) — Simulation Engine uses `close_price`, not `adjusted_close_price`. Closed.
- **Founder Decision 002** (Approved, 2026-07-11) — Identity Management: token/cookie/lockout/role/lifecycle model. Closed — implemented in full at M5.
- **Founder Decision 003** (Approved, 2026-07-12) — Educational AI System: renamed from "AI Analyst," scope (Explanation Engine + Financial Tutor only), provider (Anthropic first, `NullProvider` fallback), privacy allowlist, caching/cost-control rules, and the AI integrity check. Closed — implemented in full at M6.
- **Founder Decision 004** (Approved, 2026-07-13) — M7 Design Foundation: visual design system approval, theme architecture, M7 scope exclusions (Asset Comparison/Report Generation), minimal Account/Settings scope, growth-chart consistency as a backend precondition (KI-021 reclassified), anonymous educational AI access and its rate-limit protection principle, and the brand philosophy (trust/education over excitement, confidence without ego). Closed — full reasoning in `docs/BRAND_CONSTITUTION.md` §3.

No Founder Decisions currently awaiting approval.

## Open ADRs

All of ADR-001 through ADR-027 are **Accepted**. One carries a pending-review qualifier:
- **ADR-008** (Economic Indicators two-table design) — Accepted, but flagged "Pending Founder Review" per KI-005.

No ADR is currently in Proposed/Draft state.

## Critical Known Issues

- **KI-016 (High, Open)** — Split-consistency assumption underlying `close_price`-based calculation unverified against live data. The single highest-priority open item in the project, unrelated to M6.
- **KI-031 (Medium, Open)** — Password reset / account recovery not implemented — deliberately deferred past M5, but a real requirement before any production launch per `.claude/SECURITY_POLICY.md`.
- **KI-032 (Medium, Open)** — M6's numeric-integrity/advice-language safety checks are heuristic, not exhaustive — the most consequential open item from the Educational AI System milestone.
- **KI-003 (Medium, Open)** — API Architecture (`.claude/API_STANDARDS.md`) is provisional, pending founder approval.
- **KI-004 / KI-005 (Low/Medium, Open)** — Derived ERD and Economic Indicators two-table design, both pending founder review.

Full list (34 entries, most resolved) in `docs/KNOWN_ISSUES.md`.

## Technical Debt Summary

- KI-033 — Regeneration/follow-up cap-check TOCTOU race under genuine concurrency (low severity, mirrors KI-012/KI-027's precedent).
- KI-034 — Unverified assumption that Anthropic echoes back the exact requested model string, affecting cache efficiency only (not correctness or safety).
- KI-027 — Refresh-token rotation race under genuine concurrency (low severity, mirrors KI-012's precedent).
- KI-028 — Stateless access token cannot be revoked before its 15-minute natural expiry (accepted architectural tradeoff).
- KI-029 — Account-lockout retry-after duration not surfaced to the API client (minor UX gap).
- KI-030 — A deprecated httpx test-only parameter used to work around Secure-cookie/TestClient scheme behavior.
- KI-012 — TOCTOU race in ingestion asset/indicator get-or-create (fine at MVP single-process scale).
- KI-013/014/015 — CoinGecko OHLC fidelity, no ticker→id mapping, no retry/backoff.
- KI-021 — `growth_series`/`disclosed_splits` not persisted (empty on retrieval-after-creation); now a blocking prerequisite for the Results screen per FD-008, not a permanent design-around.
- KI-025 — `assets.exchange` returns `null` (no schema column yet).
- KI-036 — Frontend `GrowthSeriesPoint` type's per-point shape is inferred, not confirmed against a real (always-empty-today) response — verify once KI-021 is resolved, before the growth chart is built.

None of these are undocumented shortcuts — all tracked per the Technical Debt Policy in `.claude/REVIEW_CHECKLIST.md`.

## Current Branch

`main`

## Last Updated

2026-07-15 — after M7 Phase 1 (Frontend Foundation): the platform's first frontend code — tokens, theming, shared providers, API client, and eight primitive components — implemented, tested (42 tests, 94%+ coverage), linted, type-checked, and built successfully. `.gitattributes` also updated to resolve KI-010 now that frontend source files genuinely exist.
