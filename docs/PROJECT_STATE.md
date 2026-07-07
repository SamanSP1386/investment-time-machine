# PROJECT_STATE.md

The project's dashboard. Unlike DEVLOG/CHANGELOG/KNOWN_ISSUES (append-only journals),
this document is **overwritten** each time it's updated — it reflects current state,
not history. History lives in the other required documents; this one just points to it.

---

## Current Version

**0.8.1** (per `docs/CHANGELOG.md` — M7 Phase 1.5: Frontend Foundation Hardening)

## Current Milestone

**M7 Phase 1.5 — Frontend Foundation Hardening: Complete.** An external-architecture-review-driven hardening pass on M7 Phase 1's foundation, before any product page is built. Found and fixed two real, already-shipped defects (a WCAG contrast failure and a self-referencing CSS custom property affecting Badge's status colors, ADR-028; genuine API-contract drift in `SimulationResponse`/`GrowthSeriesPoint`/`DisclosedSplit` field names and nullability, KI-036/KI-038) — both caught by this review, neither by M7 Phase 1's own verification. Added: a dev-only visual playground, a financial-formatting layer with a lint-enforced never-calculates guardrail (ADR-029), live API-contract drift detection (ADR-030), an isolated `unstable_retry` type (ADR-031), and fixed TanStack Query conventions (ADR-032) — all before M7 Phase 2 builds a single product page.

## Repository Health Score

**8/10** — unchanged in headline number, but the underlying signal improved: this phase demonstrated the codebase can catch its own real defects (contrast, self-reference, contract drift) via a structured hardening pass, not just accumulate them silently.

## Production Readiness Score

**~5/10 for the platform overall**, unchanged by this phase — still no product-facing frontend surface. One new, real pre-launch item was surfaced: KI-039 (production custom-domain requirement for `SameSite=Strict` cookies to function at all is assumed by ADR-018 but never enforced or verified) — a genuine blocker for a real production launch, tracked, not yet resolved. Still held back primarily by KI-016 (unverified split-consistency assumption) and the still-unbuilt frontend product screens and Deployment milestone.

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

*(Milestone dates as recorded in `docs/DEVLOG.md`; note these predate the current system date and reflect the project's own internal timeline.)*

## Next Milestone

**M7 Phase 2 — Product Screens**, building on the now-hardened frontend foundation: the Simulator → Results flow first (this platform's core "simulate-and-explain loop"), then Asset Explorer, Simulation History, and Auth screens, per `docs/frontend_design_system.md`'s suggested sequencing. Three prerequisites flagged so far, not yet resolved: (1) `growth_series`/`disclosed_splits` persistence (KI-021/FD-008) should land before or alongside the Results screen specifically, and the Results screen must handle `status !== 'completed'` (nullable fields, `error_message`) as a real, designed case per KI-038; (2) the anonymous-AI rate-limit specifics (FD-009/010) should be confirmed before the AI panel's limit-reached state is designed; (3) KI-039's production custom-domain requirement should be resolved before any production deployment, though it does not block further Phase 2 development work itself. Simulation History and Admin Import (`docs/api_design.md`, gated on auth per KI-023) remain unbuilt and are candidates for a near-term follow-on increment.

## Open Founder Decisions

- **Founder Decision 001** (Approved, 2026-07-08) — Simulation Engine uses `close_price`, not `adjusted_close_price`. Closed.
- **Founder Decision 002** (Approved, 2026-07-11) — Identity Management: token/cookie/lockout/role/lifecycle model. Closed — implemented in full at M5.
- **Founder Decision 003** (Approved, 2026-07-12) — Educational AI System: renamed from "AI Analyst," scope (Explanation Engine + Financial Tutor only), provider (Anthropic first, `NullProvider` fallback), privacy allowlist, caching/cost-control rules, and the AI integrity check. Closed — implemented in full at M6.
- **Founder Decision 004** (Approved, 2026-07-13) — M7 Design Foundation: visual design system approval, theme architecture, M7 scope exclusions (Asset Comparison/Report Generation), minimal Account/Settings scope, growth-chart consistency as a backend precondition (KI-021 reclassified), anonymous educational AI access and its rate-limit protection principle, and the brand philosophy (trust/education over excitement, confidence without ego). Closed — full reasoning in `docs/BRAND_CONSTITUTION.md` §3.

No Founder Decisions currently awaiting approval.

## Open ADRs

All of ADR-001 through ADR-032 are **Accepted**. One carries a pending-review qualifier:
- **ADR-008** (Economic Indicators two-table design) — Accepted, but flagged "Pending Founder Review" per KI-005.

No ADR is currently in Proposed/Draft state.

## Critical Known Issues

- **KI-016 (High, Open)** — Split-consistency assumption underlying `close_price`-based calculation unverified against live data. The single highest-priority open item in the project, unrelated to M6.
- **KI-039 (Medium-High, Open)** — Production custom-domain requirement for `SameSite=Strict` cookies to function at all (ADR-018's own assumption) is never enforced or verified anywhere — a real, launch-blocking gap if the platform ships on default Vercel/Railway/Render subdomains, found during M7 Phase 1.5.
- **KI-031 (Medium, Open)** — Password reset / account recovery not implemented — deliberately deferred past M5, but a real requirement before any production launch per `.claude/SECURITY_POLICY.md`.
- **KI-032 (Medium, Open)** — M6's numeric-integrity/advice-language safety checks are heuristic, not exhaustive — the most consequential open item from the Educational AI System milestone.
- **KI-003 (Medium, Open)** — API Architecture (`.claude/API_STANDARDS.md`) is provisional, pending founder approval.
- **KI-004 / KI-005 (Low/Medium, Open)** — Derived ERD and Economic Indicators two-table design, both pending founder review.

Full list (40 entries, most resolved) in `docs/KNOWN_ISSUES.md`.

## Technical Debt Summary

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
- KI-039 — Production custom-domain requirement for `SameSite=Strict` cookies, unverified (see Critical Known Issues above).
- KI-040 — Theme-flash-prevention inline script's future CSP interaction (nonce vs. hash strategy) — deferred design note; no CSP exists yet.

Resolved this phase (kept here briefly for continuity, full detail in `docs/KNOWN_ISSUES.md`): KI-036 (frontend `GrowthSeriesPoint`/`DisclosedSplit` field names were wrong — `point_date`/`split_date`, not `date` — confirmed against the real backend schema and fixed), KI-037 (a shipped WCAG contrast failure and a self-referencing CSS custom property in the status-color tokens, ADR-028), KI-038 (six `SimulationResponse` fields were wrongly typed as always-present instead of nullable, and `error_message` was missing entirely), KI-010 (resolved at M7 Phase 1).

None of these are undocumented shortcuts — all tracked per the Technical Debt Policy in `.claude/REVIEW_CHECKLIST.md`.

## Current Branch

`main`

## Last Updated

2026-07-16 — after M7 Phase 1.5 (Frontend Foundation Hardening): found and fixed a real WCAG contrast failure and a self-referencing CSS bug in the status-color tokens (ADR-028), found and fixed real API-contract drift against the live backend schema (KI-036/KI-038, ADR-030), added a lint-enforced financial-math guardrail (ADR-029), a dev-only visual playground, an isolated `unstable_retry` type (ADR-031), and fixed TanStack Query conventions (ADR-032). 103 tests passing (4 gracefully skipped when no backend is running), 95%+ coverage, zero lint/typecheck errors, production build verified.
