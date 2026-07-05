# Milestone 5 Report — Identity Management (Authentication)

**Date**: 2026-07-11
**Version**: 0.6.0
**Status**: Complete, pending review

Self-contained — readable from the repository alone (`.claude/`, `docs/`, `backend/`), without needing prior conversation context.

---

## Objective

Implement the Identity Management system — registration, login, logout, refresh tokens, access tokens, password hashing/validation, role-based authorization, session management, and authentication middleware — per Founder Decision 002 (`docs/FOUNDER_DECISIONS.md`), which resolved every Founder Specification silence on token lifecycle, cookie strategy, anonymous-use boundaries, roles, and lifecycles (`docs/KNOWN_ISSUES.md` KI-006). OAuth, MFA, email verification, and password reset are explicitly excluded from this milestone by direct instruction — tracked forward, not forgotten (KI-031 for password reset specifically).

## Deliverables

- `app/auth/` — a self-contained Identity Management domain module (exceptions, password hashing, tokens, account lockout, repository, orchestrating service), structurally independent of `app.simulation` and `app.ingestion`, matching Founder Specification Principle 4 (Simulation Logic Must Be Independent).
- A new `refresh_tokens` table (migration `0002_refresh_tokens`), designed with multi-device session management in mind (no uniqueness on `user_id`, `user_agent`/`ip_address` captured) without building that feature's UI/API surface yet.
- Four endpoints: `POST /api/v1/auth/{register,login,refresh,logout}`, all session state delivered via httpOnly/Secure/SameSite=Strict cookies.
- Authentication/authorization middleware (`get_current_user_optional`, `get_current_user_required`, `get_current_admin_user`) wired into the existing M4 simulation routes.
- A red-team self-review that found and fixed one critical issue (a default-JWT-secret startup guard, ADR-020) and documented four residual risks as tracked, deliberate technical debt.
- 62 new tests (221 total project-wide), all passing against live Postgres and Redis.
- Four new ADRs, one new Founder Decision, this report, and updates to all seven Documentation Policy journals plus `docs/PROJECT_STATE.md`.

## Architecture

```
                      ┌───────────────────────┐
   register/login ───▶│   app.auth.service     │◀─── refresh/logout
                      │  (pure domain logic,   │
                      │   no HTTP/cookies)      │
                      └──────────┬─────────────┘
                                 │
                      ┌──────────▼─────────────┐
                      │  app.auth.repository    │
                      │  (users, refresh_tokens)│
                      └──────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   app.api.v1.services.    │
                    │      auth_service         │  ← commits/rolls back,
                    │ (cookies via router, audit)│    audits, per outcome
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  app.api.v1.routers.auth  │  ← thin: cookie set/clear only
                    └───────────────────────────┘
```

- **`app/auth/password.py`**: Argon2 hashing (Founder Specification Part 2.8.5); an 8-character minimum floor (the spec says a password must "meet requirements" but never defines them — a documented gap-fill, not a spec citation); a fixed dummy-hash comparison so `verify_password` costs the same whether or not a real account exists, closing a login-timing side channel.
- **`app/auth/tokens.py`**: 15-minute stateless JWT access tokens (`sub`, `is_admin`, `iat`, `exp`, `jti`, `typ`); opaque 256-bit refresh tokens, only their SHA-256 hash ever persisted.
- **`app/auth/lockout.py`**: Redis-backed, per-account (email-keyed) failure counter — 5 attempts / 15-minute window — a distinct mechanism from the existing per-IP `RateLimiter`, since IP-based limiting alone cannot stop a distributed credential-stuffing attempt against one target account (Founder Specification Part 3.6.7).
- **`app/auth/service.py`**: `register_user`, `authenticate` (lockout checked before password verification; `is_active` checked only *after* a correct password, so a wrong-password guess against a suspended account never discloses the suspension), `refresh_session` (rotation with reuse detection — a replayed, already-rotated token revokes every active session for that user), `logout` (idempotent, silent on an unrecognized token).
- **API layer** (`app/api/v1/{schemas,services,routers}/auth.py`): mirrors `simulation_service`'s transaction-boundary discipline, with one new case — `RefreshTokenReuseDetectedError` must be committed (not rolled back), since the domain layer's precautionary revoke-everything write happens before the exception is raised.
- **Middleware** (`app/api/v1/dependencies.py`): `get_current_user_optional` re-loads the user from the database every request (never trusting the JWT's `is_admin` claim alone) — a mid-session suspension or privilege change takes effect immediately, not after the token's full 15-minute lifetime.

## Files Changed

**Created**: `backend/app/models/refresh_token.py`; `backend/alembic/versions/0002_refresh_tokens.py`; `backend/app/auth/` (7 modules); `backend/app/api/v1/schemas/auth.py`, `services/auth_service.py`, `routers/auth.py`; `backend/tests/auth/` (6 files, 38 tests); `backend/tests/api/test_auth.py` (15 tests), `test_dependencies.py` (4 tests); `backend/tests/core/test_config.py` (5 tests); `docs/MILESTONE_REPORTS/M5_REPORT.md` (this file).

**Modified**: `backend/app/models/{__init__,user}.py`; `backend/app/api/v1/{__init__,dependencies,errors,audit,exception_handlers}.py`; `backend/app/api/v1/routers/simulations.py`; `backend/app/core/config.py`; `backend/requirements.txt`; `backend/tests/api/conftest.py`; `.env.example`; `.claude/{SECURITY_POLICY,DATABASE_RULES}.md`; `docs/{FOUNDER_DECISIONS,ARCHITECTURE_DECISIONS,KNOWN_ISSUES,DEVLOG,CHANGELOG,SECURITY_LOG,TESTING_REPORT,PERFORMANCE_LOG,PROJECT_STATE}.md`.

## Tests

**221/221 passing** (159 from M0–M4 + 62 new). 26 non-DB unit tests (password, tokens, lockout against real Redis, the JWT-secret startup guard, the RBAC dependency functions called directly), 21 DB-integration tests (`app.auth.service`'s full behavior matrix, including the two-"device" refresh-reuse scenario), 15 HTTP-integration tests (all four endpoints, cookie attributes, enumeration resistance, wiring into the existing simulation routes).

Notable results:
- `test_refresh_reuse_is_detected_and_revokes_every_active_session`: proves a replayed, rotated-away token revokes a *second, uninvolved* session's token too — the single most consequential test in this milestone.
- `test_authenticate_rejects_inactive_account_only_after_correct_password`: proves the security-critical ordering that prevents a suspended-account status from being an enumeration oracle.
- `test_login_rejects_unknown_email_identically_to_wrong_password`: HTTP-level proof of enumeration resistance (identical status and error code).
- `test_default_jwt_secret_is_rejected_in_production`: proves the red-team-driven startup guard actually blocks the misconfiguration it exists to prevent.

## Security Review

Full Red Team Review in `docs/SECURITY_LOG.md`'s M5 entry. Summary: one critical finding (forgeable tokens via the default `JWT_SECRET` placeholder in a misconfigured deployment) was found and **fixed** (ADR-020), not merely documented. Four residual risks were found and **documented as tracked debt**, not fixed: KI-027 (low-severity concurrent-refresh race, mirrors KI-012's precedent), KI-028 (the stateless access token's inherent non-revocability window — an accepted tradeoff of the approved architecture), KI-029 (lockout retry-after duration not surfaced to the client — a UX gap, arguably a minor security positive), KI-031 (password reset itself, deliberately out of scope per direct instruction, but a real pre-production-launch requirement).

## Founder Specification Compliance

| Decision | Status |
|---|---|
| Email + password authentication, Argon2 | Implemented exactly as specified (Part 2.8.4/2.8.5) |
| Two roles only (User/Admin) | Implemented exactly as specified (Part 2.8.6) |
| Anonymous simulations remain allowed | Re-confirmed and scoped explicitly (Founder Decision 002), not silently carried over from M4 |
| Simulation History requires auth | Middleware ready; endpoint itself still deferred (KI-023) |
| Rate limiting on auth endpoints, 10/min | Implemented exactly as specified (Part 2.8.13) |
| Account lockout (Part 3.6.7 mitigation) | Implemented as a distinct, email-keyed mechanism (ADR-019) |
| Token/session lifecycle | Fully specified by Founder Decision 002, closing a confirmed spec silence (KI-006) |
| OAuth, MFA, email verification, password reset | Explicitly deferred per direct instruction, tracked (KI-031 for password reset) |

## Technical Debt

| ID | Item | Status |
|---|---|---|
| KI-027 | Refresh-token rotation race under genuine concurrency | Open — low severity, mirrors KI-012 |
| KI-028 | Stateless access token cannot be revoked before 15-min expiry | Open — accepted architectural tradeoff |
| KI-029 | Account-lockout retry-after not surfaced to the client | Open — minor UX gap |
| KI-030 | Deprecated httpx per-request `cookies=` used in tests | Open — test-infrastructure only |
| KI-031 | Password reset / account recovery not implemented | Open — deliberately deferred, must ship before production |

## Production Readiness

**6/10** for Identity Management specifically — fully tested, no known unfixed vulnerability, but password reset (a real pre-launch requirement per this project's own security policy) is deliberately unbuilt, and the rotation race (KI-027) is unhardened. Platform-wide readiness remains gated primarily on KI-016 (carried from M3) and the still-unbuilt Frontend/AI Explanations/Deployment milestones.

## Recommended Next Milestone

**M6 — AI Explanations**, per the approved MVP build order — subject to its own design review before implementation, matching the process this milestone itself followed. Before or alongside M6: consider whether password reset (KI-031) should be pulled forward given it blocks production launch regardless of which milestone builds it.
