# PROJECT_STATE.md

The project's dashboard. Unlike DEVLOG/CHANGELOG/KNOWN_ISSUES (append-only journals),
this document is **overwritten** each time it's updated — it reflects current state,
not history. History lives in the other required documents; this one just points to it.

---

## Current Version

**0.6.0** (per `docs/CHANGELOG.md` — M5: Identity Management)

## Current Milestone

**M5 — Identity Management (Authentication): Complete.** Registration, login, logout, refresh (with rotation + reuse detection), Argon2 password hashing, account lockout, role-based authorization, and authentication middleware are implemented and tested. OAuth, MFA, email verification, and password reset are explicitly deferred (KI-031 for the last).

## Repository Health Score

**8/10** — unchanged from the M5 Design Review assessment; M5's implementation reinforced rather than changed this score (consistent architecture/testing/documentation discipline maintained, no regression in any dimension).

## Production Readiness Score

**~4.5/10 for the platform overall** (up slightly from ~4/10 pre-M5). Identity Management itself is scored 6/10 (see `docs/MILESTONE_REPORTS/M5_REPORT.md`) — fully tested with no known unfixed vulnerability, but password reset (KI-031) is a real pre-launch gap. Platform-wide, still held back primarily by KI-016 (unverified split-consistency assumption, unrelated to M5, still the single highest-priority open item) and three still-unbuilt milestones (AI Explanations, Frontend, Deployment).

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

*(Milestone dates as recorded in `docs/DEVLOG.md`; note these predate the current system date and reflect the project's own internal timeline.)*

## Next Milestone

**M6 — AI Explanations**, per the approved MVP build order. Requires its own design review before implementation (matching the process M5 followed) — not yet started. Simulation History and Admin Import (`docs/api_design.md`, gated on auth per KI-023) remain unbuilt and are candidates for a near-term follow-on increment now that the authentication middleware exists.

## Open Founder Decisions

- **Founder Decision 001** (Approved, 2026-07-08) — Simulation Engine uses `close_price`, not `adjusted_close_price`. Closed.
- **Founder Decision 002** (Approved, 2026-07-11) — Identity Management: token/cookie/lockout/role/lifecycle model. Closed — implemented in full this milestone.

No Founder Decisions currently awaiting approval.

## Open ADRs

All of ADR-001 through ADR-020 are **Accepted**. One carries a pending-review qualifier:
- **ADR-008** (Economic Indicators two-table design) — Accepted, but flagged "Pending Founder Review" per KI-005.

No ADR is currently in Proposed/Draft state.

## Critical Known Issues

- **KI-016 (High, Open)** — Split-consistency assumption underlying `close_price`-based calculation unverified against live data. The single highest-priority open item in the project, unrelated to M5.
- **KI-031 (Medium, Open)** — Password reset / account recovery not implemented — deliberately deferred past M5, but a real requirement before any production launch per `.claude/SECURITY_POLICY.md`.
- **KI-003 (Medium, Open)** — API Architecture (`.claude/API_STANDARDS.md`) is provisional, pending founder approval.
- **KI-004 / KI-005 (Low/Medium, Open)** — Derived ERD and Economic Indicators two-table design, both pending founder review.

Full list (31 entries, most resolved) in `docs/KNOWN_ISSUES.md`.

## Technical Debt Summary

- KI-027 — Refresh-token rotation race under genuine concurrency (low severity, mirrors KI-012's precedent).
- KI-028 — Stateless access token cannot be revoked before its 15-minute natural expiry (accepted architectural tradeoff).
- KI-029 — Account-lockout retry-after duration not surfaced to the API client (minor UX gap).
- KI-030 — A deprecated httpx test-only parameter used to work around Secure-cookie/TestClient scheme behavior.
- KI-012 — TOCTOU race in ingestion asset/indicator get-or-create (fine at MVP single-process scale).
- KI-013/014/015 — CoinGecko OHLC fidelity, no ticker→id mapping, no retry/backoff.
- KI-021 — `growth_series`/`disclosed_splits` not persisted (empty on retrieval-after-creation).
- KI-025 — `assets.exchange` returns `null` (no schema column yet).
- KI-010 — `.gitattributes` needs explicit entries for new file types (e.g. `.tsx`) once M7 (Frontend) begins.

None of these are undocumented shortcuts — all tracked per the Technical Debt Policy in `.claude/REVIEW_CHECKLIST.md`.

## Current Branch

`main`

## Last Updated

2026-07-11 — after M5 (Identity Management) implementation, testing, red-team review, and documentation.
