# SECURITY_LOG.md

Security review record, one entry per milestone. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md) and [.claude/SECURITY_POLICY.md](../.claude/SECURITY_POLICY.md) for the governing threat model.

---

## M0 — Repository & Environment Foundation (2026-07-02)

**Risks Found**: None new at this layer — no user data, auth, or financial calculation exists yet to attack. The relevant risk at this stage was process-level: secrets or credentials landing in source control from the very first commit.

**Severity**: N/A (no product attack surface yet).

**Mitigations Implemented**:
- gitleaks secret scanning wired into both CI (`.github/workflows/ci.yml`) and local pre-commit (`.pre-commit-config.yaml`) — active before any real credential ever exists in the repo.
- `.env` is gitignored; `.env.example` contains placeholder values only and documents reserved-but-unset future variables (`JWT_SECRET`, `AI_PROVIDER_API_KEY`, `REDIS_URL`) so their eventual introduction doesn't require guessing the variable name.
- All configuration flows through a single `Settings` class (`app/core/config.py`) — no module reads `os.environ` directly, which prevents ad hoc, unaudited secret handling from starting anywhere in the codebase.
- No direct database access exists yet from any client — not applicable until M1, but the API-mediated-access principle is documented in `.claude/SYSTEM.md` ahead of time.

**Remaining Risks**: None specific to this milestone's scope. Broader platform risks (credential stuffing, secret exposure at runtime, token lifecycle) remain tracked in `.claude/SECURITY_POLICY.md` and apply starting at the milestones that introduce the relevant surface (Auth: M5; API: M4).

**Threats Deferred**: All 13 threats in the Founder Specification's threat model (Part 3.6) remain deferred until their owning milestone is built — none are mitigated by infrastructure alone. Six future threats (prompt injection, data poisoning, model manipulation, supply chain attacks, social engineering, advanced credential theft) remain entirely unmitigated per the source spec and are not addressed by M0.

---

## M1 — Database Schema & Migrations (2026-07-05)

**Risks Found**:
- `audit_logs` records `ip_address` (PII) with no schema-level retention or redaction — a schema can't enforce redaction logic, only the application layer can.
- `audit_logs.entity_id` is a polymorphic reference with no FK, meaning the database cannot guarantee it points at a real row — an application bug could write a dangling reference.
- `users.password_hash` is nullable (to support future OAuth) — meaning the schema alone cannot guarantee every non-OAuth account has a password; that invariant must be enforced by application/service-layer logic, not the database, once Auth (M5) is built.

**Severity**: Low for all three — none are exploitable yet since no ingestion, API, or auth code exists to write through this schema. They are structural risks to carry forward into the milestones that do write to these tables.

**Mitigations Implemented**:
- `audit_logs.user_id` uses `ON DELETE SET NULL` (ADR-009) so the audit trail cannot be destroyed by a user-account deletion — directly supports the "Data Tampering"/"Loss of User Trust" risk categories in the Founder Specification's own risk register (Part 2.21).
- All financial values use `NUMERIC(20,8)`/`NUMERIC(10,6)` — no `FLOAT`/`REAL`/`DOUBLE PRECISION` anywhere (verified by `test_no_float_or_real_columns_hold_financial_values`), closing off floating-point drift as a data-integrity risk before any calculation code exists.
- All ten tables use DB-enforced FK constraints except the one documented, justified exception (`audit_logs.entity_id`) — application-level-only relationships are not used anywhere else, reducing the risk of orphaned/dangling references.
- `calculation_version` present from migration 1 — directly mitigates the Founder Specification's #1-ranked risk (incorrect/non-reproducible simulation results) at the schema level, ahead of the Simulation Engine milestone that will use it.
- Migration verified against a live Postgres instance with zero drift from the models (see Testing Summary) — reduces the risk of a schema/ORM mismatch silently causing incorrect reads/writes later.

**Remaining Risks**: PII retention/redaction policy for `audit_logs.ip_address` is still undefined at the application layer (tracked in `.claude/SECURITY_POLICY.md`, not newly introduced by M1). No row-level security or database-level access control has been configured yet — all access control is deferred to the API layer (M4) and Auth (M5), consistent with the "Simple Security First" philosophy in `.claude/SECURITY_POLICY.md`.

**Threats Deferred**: Unchanged from M0 — no new milestone-owned threats are mitigated or newly exposed by a schema-only milestone. Credential stuffing, secret exposure at runtime, and token lifecycle remain owned by Auth (M5) and API (M4).

---

## M2 — Historical Data Ingestion Pipeline (2026-07-07)

**Risks Found**:
- External providers (yfinance, CoinGecko, FRED) are, by definition, untrusted input sources — a compromised or buggy provider response could attempt to inject malformed, out-of-range, or malicious-looking data into the platform's historical record.
- `FredProvider` sends `FRED_API_KEY` as a query parameter on every request — standard for the FRED API, but means the key appears in plaintext in the request URL (sent over HTTPS; not logged by this codebase, but visible to anything that can see the outbound request, e.g. a proxy).
- The `get_or_create_asset`/`get_or_create_indicator` TOCTOU race (KI-012) is a data-integrity risk under concurrency, not currently an exploitable security risk (no concurrent ingestion paths exist).

**Severity**: Medium for the untrusted-provider-input risk (mitigated, see below); Low for the FRED API key exposure (standard for the API, HTTPS-protected, not logged); Low for the TOCTOU race (no concurrent execution path exists yet to trigger it).

**Mitigations Implemented**:
- Every raw provider record passes through explicit validation (`app/ingestion/validation/rules.py`) before normalization or storage — malformed, out-of-range, non-positive, or future-dated values are rejected with an explicit reason, never silently repaired, coerced, or passed through.
- No provider adapter (`app/ingestion/providers/`) imports `app.models` or `app.core.database` — a structural guarantee (not just a convention) that the Provider Layer cannot write to the database directly, enforced by module boundaries and verified by the fact that every provider test runs with zero database dependency.
- All database writes use parameterized SQLAlchemy Core/ORM constructs (`sqlalchemy.dialects.postgresql.insert`, `select`) — no string-interpolated SQL anywhere in the ingestion pipeline, closing off SQL injection via a malicious symbol/indicator code.
- `FRED_API_KEY` is sourced exclusively from `Settings` (environment variable), never hardcoded, never logged — verified by inspecting every `logger.*` call in the Provider Layer.
- Idempotent upserts (`ON CONFLICT DO NOTHING`) plus per-record SAVEPOINTs (ADR-013) mean a malformed or adversarial record can, at worst, be rejected or fail to insert — it cannot corrupt or discard previously-stored legitimate data in the same batch.
- CoinGecko's known OHLC data-fidelity limitation is disclosed (ADR-012), not hidden — a transparency measure directly serving the "Historical Truth Is Sacred" principle.

**Remaining Risks**: The TOCTOU race in asset/indicator resolution (KI-012) should be closed before any concurrent/scheduled ingestion path is introduced. No rate-limiting or backoff exists for provider requests (KI-015) — not a security risk today (single-operator, manually-triggered imports) but would become an availability concern (self-inflicted rate-limit bans) under automated, frequent scheduling.

**Threats Deferred**: "Malicious Data Import" and "Corrupted Historical Data" (Founder Specification threat model, Part 3.6) are the threats this milestone most directly addresses — validation and idempotent storage are the primary mitigations now in place. "Provider Outage" is partially mitigated (explicit `ProviderUnavailableError`/`NetworkTimeoutError` handling) but retry/backoff (KI-015) remains deferred to a future scheduler milestone.

---

## M3 — Simulation Engine (2026-07-09)

**Risks Found**:
- The Simulation Engine is the platform's "sole source of financial truth" (Founder Specification 2.14.2) — an incorrect calculation here is the single highest-impact risk in the entire platform (ranked #1 in the Founder Specification's own risk register, Part 2.21).
- The split-consistency assumption underlying `close_price`-based calculation (Founder Decision 001) remains empirically unverified against live data (KI-016) — if wrong, historical returns spanning a stock split would be silently incorrect.
- `run_simulation` accepts a caller-supplied `symbol` string used in a database query — reviewed for injection risk.

**Severity**: High for the split-consistency assumption (unverified, but code-level behavior is correct and tested); Low for the symbol-lookup path (parameterized query, no injection vector).

**Mitigations Implemented**:
- Deterministic, explicit, per-event calculation model (Founder Decision 001) — no opaque provider-adjustment black box; every dollar of return traceable to a specific stored price or dividend row, directly serving auditability.
- `adjusted_close_price` is structurally never read by any Simulation Engine code path — verified by a dedicated test (`test_adjusted_close_price_is_never_read_even_when_wildly_different`) that would fail loudly if a future change accidentally introduced a read.
- All database access in `app/simulation/repository.py` uses parameterized SQLAlchemy Core/ORM constructs (`select()`) — no string-interpolated SQL, no injection vector via `symbol` or any other caller-supplied value.
- Every controlled error path is explicit and named (Founder Specification 2.14.14) — no bare `except Exception` anywhere in the Simulation Engine; a genuine unclassified bug is allowed to propagate rather than being silently absorbed into a generic failure.
- Failed simulations are persisted with a descriptive `error_message` (Founder Specification 2.6.24) for debugging, but never with a fabricated or partially-computed result — output fields remain `NULL` on failure, never a best-guess value.
- Determinism verified directly by test (`test_engine_determinism.py`) — the same inputs against the same stored data produce byte-identical Decimal output across 3 consecutive runs, directly satisfying the Founder Specification's "non-negotiable" determinism requirement (2.14.12).

**Remaining Risks**: KI-016 (split-consistency assumption unverified against live data) is carried forward as the single most important open item before this design should be trusted with real user-facing simulations — a concrete manual verification runbook is documented, not just flagged. KI-020 (Dividend Contribution metric not yet exposed) is a scope gap, not a security risk.

**Threats Deferred**: "Incorrect Simulation Results" (Founder Specification's #1-ranked threat) is directly mitigated by this milestone's known-answer and determinism tests, but full closure depends on KI-016's live verification. No new threats introduced — the Simulation Engine has no external network calls, no user-facing endpoint yet (M4), and reads only already-validated data.

---

## M4 — API Layer (2026-07-10)

**Risks Found**:
- This is the platform's first HTTP-exposed attack surface — the first milestone where an external caller can send arbitrary input directly to backend code.
- `POST /api/v1/simulations` is public and unauthenticated (founder-approved, KI-022), so it is available to anyone, including automated abuse, without an account.
- A 500-class error (`CalculationError`, or the boundary-level catch-all) could, if implemented carelessly, leak internal detail (stack traces, SQL, file paths) to the client.
- If the DB-session dependency auto-rolled-back on any exception (a common FastAPI default), a failed simulation's already-flushed audit-relevant `Simulation` row (Founder Specification Part 2.6.24) could be silently destroyed on its way out of the API layer.
- `docs/api_design.md`'s stated audit-logging requirement for simulation creation was not implemented (KI-026) — a documentation-vs-implementation drift discovered during this milestone's own post-implementation review, not a newly introduced vulnerability, but a gap in the auditability the design intended.

**Severity**: Medium for the unauthenticated public endpoint (mitigated by rate limiting, per explicit founder decision — see below); Low for the error-message-leak risk (mitigated, verified by test); Low for the transaction-boundary risk (mitigated by design, verified by test); Low for the missing audit-log write (no confidentiality/integrity impact — the simulation record itself is still stored — but a real gap in the intended audit trail).

**Mitigations Implemented**:
- Redis-backed fixed-window rate limiting (`app/core/rate_limit.py`): 60/min on `POST /api/v1/simulations`, 100/min on read endpoints, keyed by client IP — the founder-approved control substituting for authentication on the public simulation-creation endpoint (KI-022). Fails open (allows the request, logs a warning) if Redis is unreachable, a deliberate choice so a rate-limiter outage cannot take down the core simulation feature — mirrors the Founder Specification's own AI-failure-isolation philosophy (Part 3.4.4), applied here by analogy to a new dependency.
- Every request body is validated by Pydantic before reaching a service function; `investment_amount` is accepted only as a string/Decimal-compatible token, never silently coerced through a JSON float, closing off the float-precision-loss risk at the API boundary the same way M3 closed it internally.
- Every named exception type (`AssetNotFoundError`, `InvalidDateRangeError`, `InvalidInvestmentAmountError`, `MissingHistoricalDataError`, `CalculationError`, `SimulationNotFoundError`, `ForbiddenError`, `RateLimitExceededError`, Pydantic's `RequestValidationError`) maps to an explicit, reviewed HTTP status and error code in `app/api/v1/exception_handlers.py`. `CalculationError` and the one legitimate boundary-level `Exception` catch-all log full detail server-side (`exc_info=True`) but return only a generic message plus a `request_id` to the client — verified this doesn't leak by inspecting every handler's response body construction directly, not just by convention.
- `app/api/v1/dependencies.py::get_db_session` deliberately never auto-commits or auto-rolls-back; `simulation_service.create_simulation` explicitly owns the commit/rollback decision per exception type, so a `MissingHistoricalDataError`/`CalculationError`'s already-persisted failed `Simulation` row survives (committed), while pre-flight validation errors correctly roll back (nothing was written) — see ADR-016. This is a correctness-and-integrity control, not just a code-quality one: getting it wrong would silently violate Founder Specification Part 2.6.24.
- All database access in the new service layer uses parameterized SQLAlchemy Core/ORM constructs (`select`, `session.get`) — no string-interpolated SQL, no injection vector via `asset_symbol` or any other caller-supplied value.
- No admin or authentication-requiring routes are implemented or exposed — Simulation History and Admin Import remain design-only (`docs/api_design.md`), per explicit founder instruction, closing off the "unprotected admin surface" risk entirely rather than partially.

**Remaining Risks**: KI-026 (audit-logging requirement from the M4 design note, not implemented) should be closed in a follow-up pass or explicitly deferred with founder sign-off — currently open, tracked honestly rather than silently dropped. KI-016 (M3's split-consistency assumption) remains the platform's highest-severity open item, now with a real caller (this milestone) that makes closing it more urgent, not less. No load/abuse testing has been performed against the rate limiter's real-world effectiveness (only its logical correctness is unit-tested).

**Threats Deferred**: Credential stuffing, token lifecycle, and session management remain fully owned by Auth (M5) — this milestone deliberately implements zero authentication, per founder instruction, so these threats are neither newly mitigated nor newly exposed. "Malicious/Automated Simulation Abuse" (a reasonable read of Founder Specification Part 2.8.13's rate-limiting requirement) is the one new threat this milestone directly owns and mitigates via rate limiting.

---

## M4 Follow-Up — Simulation Audit Logging, KI-026 (2026-07-10)

**Risks Found**:
- Prior to this fix, `POST /api/v1/simulations` left no audit trail at all — a gap against Founder Specification Part 2.8.14 and against this milestone's own design note. Without an audit trail, detecting and investigating abuse of the public, unauthenticated simulation-creation endpoint (e.g. a pattern of repeated `AssetNotFoundError` probes, or a burst of `CalculationError`s indicating a bug being actively triggered) would have depended entirely on the rate limiter and application logs, not a queryable, structured record.
- A naively-implemented audit write (e.g. one that raises on failure) could turn a working simulation endpoint into a new single point of failure — an outage or bug in the audit-write path would otherwise take down a feature that has nothing to do with auditing.

**Severity**: Medium for the original gap (mitigated now — see below); Low for the new-single-point-of-failure risk (mitigated by design, not just intent).

**Mitigations Implemented**:
- `app/api/v1/audit.py::record_simulation_audit` writes one row per attempt for every code path in `simulation_service.create_simulation` — success, all three pre-flight validation errors, and both mid-simulation errors — and `record_simulation_request_validation_audit` covers the one remaining category (Pydantic-level request validation failures) via a narrowly-scoped, path-checked handler.
- The audit write is isolated in a SAVEPOINT (`session.begin_nested()`) and wrapped in a `try/except SQLAlchemyError` that logs and swallows rather than propagates — a broken or slow audit write cannot turn a correct simulation result, or an already-correctly-classified error response, into an unrelated 500. This mirrors the Redis rate-limiter's fail-open policy (`app/core/rate_limit.py`) and is a deliberate, tested design choice, not an afterthought.
- `entity_id` is always populated (a real `Simulation.id` when one exists, a synthetic `uuid4()` correlation id otherwise) — every audit row is queryable and self-describing even for failure categories that never persist a `Simulation` row at all.
- `user_id` is always `NULL` on every audit row (M4 has no authentication) — no risk of writing a fabricated or guessed user attribution.

**Remaining Risks**: The audit trail currently has no consumer (no `GET /api/v1/admin/audit-logs` or equivalent exists — deliberately, per the founder's instruction not to build admin routes in this fix). It exists for future investigative/compliance use, not yet wired into any monitoring or alerting. No new `SIMULATION_FAILED` enum value was added (a deliberate, disclosed choice — see `docs/KNOWN_ISSUES.md` KI-026) — a future consumer querying `audit_logs` by `event_type` alone cannot distinguish a succeeded from a failed simulation attempt without also reading `details.status`; this is a documented query-ergonomics tradeoff, not a security gap.

**Threats Deferred**: Unchanged from the M4 entry above — this follow-up closes one specific auditability gap and introduces no new deferred threat.

---

## M5 — Identity Management (2026-07-11)

**Risks Found**: This is the platform's first credential-handling, session-issuing attack surface. A structured red-team self-review (attempting to attack the actual implementation, not just the design) was performed after implementation, covering: authentication bypass, session/cookie theft, rate-limit/lockout bypass, privilege escalation, account enumeration, and refresh-token replay. Findings below are grouped by outcome.

**Severity**: Critical for the JWT-secret misconfiguration finding (fixed); Low for each documented residual risk (none rated higher, since none allow an unauthenticated actor to gain access they shouldn't have under a correctly-configured deployment).

**Red Team Review — findings and outcomes**:

1. **Can authentication be bypassed?** — **Critical finding, fixed.** The default `jwt_secret` ("changeme-dev-only...") exists so local development needs zero setup, mirroring the existing `database_url` convention. Unlike a wrong DB password (which fails loudly), a forgotten `JWT_SECRET` in a real deployment is silently catastrophic: the signing key is public (committed in `.env.example`), letting anyone forge a valid access token for any user, including `is_admin: true`, with no error anywhere to reveal it. **Fixed**: `Settings` now has a `model_validator` (ADR-020) that refuses to start with the default secret outside `development`/`test` environments. Verified by `tests/core/test_config.py` (5 tests).
   No other bypass was found: `get_current_user_optional` re-verifies the user against the database on every request (never trusting the token's `is_admin` claim alone), and no route derives identity from any other client-supplied value.

2. **Can sessions be stolen?** — Cookies are httpOnly (JS, including XSS, cannot read them) and Secure (never sent over plaintext HTTP). Verified directly by `test_register_sets_httponly_secure_strict_cookies`. **Residual, documented risk (KI-028)**: a stolen *access token* cannot be revoked before its 15-minute natural expiry, even if the corresponding refresh token is immediately revoked (inherent to the approved stateless-JWT design, ADR-017/018) — bounded, not exploitable to obtain a *new* session, and judged an acceptable tradeoff at MVP scale.

3. **Can cookies be abused (CSRF)?** — `SameSite=Strict` means neither cookie is ever attached to a cross-site request, closing off the primary CSRF vector for every state-changing endpoint (register/login/refresh/logout, simulation creation). No dedicated CSRF token was added — judged sufficient given SameSite=Strict and a same-origin-deployable frontend (ADR-018); flagged as a deliberate simplification, not an oversight.

4. **Can rate limits be bypassed?** — The existing per-IP `RateLimiter` (applied to `/auth` at 10/min) is bypassable by an attacker rotating source IPs — a pre-existing, known limitation of per-IP limiting, not new to M5. **This is exactly why `AccountLockout` (ADR-019) exists as a second, independent, per-account (email-keyed) mechanism** — verified directly: `test_authenticate_locks_out_after_repeated_failures` locks the account after 3 failures regardless of source IP, and IP rotation does not reset the email-keyed counter. **Residual, documented risk**: both mechanisms fail open if Redis is unreachable (the project's established availability-over-strictness policy, applied consistently here) — an attacker who can also induce a Redis outage gains an unprotected window; accepted, matching the existing rate-limiter precedent.

5. **Can privilege escalation occur?** — `get_current_admin_user` re-checks `user.is_admin` freshly loaded from the database; no route or dependency trusts a client-supplied or token-embedded role claim as authoritative. Verified directly (`tests/api/test_dependencies.py`, since no admin route exists yet via HTTP to exercise this end-to-end — the same honest gap M4 disclosed for `ForbiddenError` at the time).

6. **Can accounts be enumerated?** — Login is verified, at both the service layer (`test_authenticate_rejects_unknown_email_with_generic_error` / `..._wrong_password_with_generic_error`, identical exception) and the HTTP layer (`test_login_rejects_unknown_email_identically_to_wrong_password`, identical status + error code), to be indistinguishable between "no such account" and "wrong password" — including a fixed dummy-Argon2-hash comparison so the *timing* is also equalized, not just the response body. Registration deliberately *does* disclose "email already registered" — a documented, industry-standard exception (registration enumeration is lower-severity and standard UX requires it), not an inconsistency.

7. **Can refresh tokens be replayed?** — Directly tested and defended: `test_reusing_a_rotated_away_refresh_token_is_rejected` (HTTP) and `test_refresh_reuse_is_detected_and_revokes_every_active_session` (service-level, a two-"device" scenario proving the *other*, uninvolved session is also revoked as a precaution). **New, documented residual risk (KI-027)**: the rotation read-then-write has no row-level lock, so two genuinely concurrent refresh calls presenting the same still-valid token could both succeed, forking one session into two — low severity (no privilege gain, mirrors KI-012's precedent), tracked for a future concurrency-hardening pass.

**Mitigations Implemented**: Argon2 password hashing; per-account lockout (5 attempts / 15-minute window) distinct from per-IP rate limiting; refresh-token rotation with reuse detection; httpOnly/Secure/SameSite=Strict cookie delivery, never a response body or `localStorage`; database-verified authorization on every request; a hard startup guard against the default JWT secret; every auth outcome (register, login success/failure, refresh success/failure/reuse, logout) audited via the existing SAVEPOINT-isolated, fail-open pattern (`record_auth_audit`), reusing the M1 schema's already-present `USER_REGISTERED`/`USER_LOGIN_SUCCEEDED`/`USER_LOGIN_FAILED`/`USER_LOGOUT` event types.

**Remaining Risks**: KI-027 (concurrent-refresh race, low severity), KI-028 (access-token non-revocability window, accepted tradeoff), KI-029 (lockout retry-after not surfaced to the client, UX gap not a security gap), KI-031 (password reset itself not yet built — deliberately deferred, but a real pre-production-launch requirement per `.claude/SECURITY_POLICY.md`). KI-016 (carried from M3) remains the platform's single highest-priority open item, unrelated to this milestone.

**Threats Deferred**: OAuth, MFA, email verification, and password reset remain fully deferred per direct instruction (Founder Decision 002) — none of these are newly mitigated or newly exposed by this milestone, since none are implemented. Prompt injection, data poisoning, model manipulation, supply chain attacks, social engineering, and advanced credential theft remain the Founder Specification's own named-but-unmitigated future threats, unchanged by this milestone.

---

## M6 — Educational AI System (2026-07-12)

**Risks Found**: This is the platform's first milestone with (1) a third-party commercial data-sharing dependency, (2) LLM-generated content reaching users, and (3) — via the Financial Tutor — the first user-authored free-text field the platform has ever built. A combined AI Safety Review (verifying the design's own core promises) and Red Team Review (adversarial questions against the implementation) were performed before this document was finalized.

**Severity**: Medium overall — no finding allows the AI to alter a financial fact or exfiltrate user-identifying data; the highest-severity residual items are heuristic-coverage gaps in the safety checks (KI-032), not architectural holes.

**AI Safety Review — the design's own core promises, verified against the implementation**:

1. **Could AI invent a number?** — Structurally difficult, not just discouraged: `app.ai` never has access to any value it wasn't explicitly handed in `simulation_facts`, and every generation is post-validated by `check_numeric_integrity` (`app/ai/safety.py`) against that exact same dict before it is ever persisted as `COMPLETED` or shown to a user. Verified directly by `tests/ai/test_service.py::test_generate_explanation_rejects_fabricated_numbers` and `test_generate_followup_answer_rejects_fabricated_numbers`, both proving a fabricated figure raises `AIIntegrityViolationError` and blocks the generation outright — the row is marked `FAILED`, `explanation_text` stays `NULL`. **Residual risk (KI-032)**: the regex-based integrity check does not catch every possible fabrication style (numbers spelled out in words, abbreviated notation) — a heuristic, not a proof.
2. **Could AI contradict the Simulation Engine?** — The API response schema keeps `simulation_facts`-derived data and AI `narrative` in structurally separate places; the frontend contract (documented for the future M7 milestone) is required to source every number from the simulation's own stored fields, never from AI-generated prose. The Simulation Engine itself is untouched by this milestone — verified by the fact that zero files under `app/simulation/` were modified, and the full pre-M6 test suite (221 tests) still passes unchanged.
3. **Could AI leak user information?** — `_build_simulation_facts` (`app/api/v1/services/explanation_service.py`) is the single, auditable choke point for everything `app.ai` is ever allowed to see, and it is a strict allowlist that excludes email, display name, user ID, IP address, session ID, request ID, and auth information by construction — there is no code path where any of these could reach a prompt. Verified directly by `test_explanation_audit_log_written_on_success`, which additionally confirms the generated text itself never leaks into the audit trail.
4. **Could prompt injection alter financial facts?** — No: even a successful injection (the model being tricked into ignoring its system prompt) cannot change a financial fact, because `check_numeric_integrity`/`check_output_structure`/`check_advice_language` run on the model's *output* regardless of what caused it, and the frontend contract never treats AI narrative as an authoritative number source in the first place. Prompt injection could, at most, produce a rejected (`FAILED`) generation — an availability/UX degradation, not a financial-integrity breach.
5. **Could provider outage break the product?** — No: `POST /api/v1/simulations` never calls `app.ai` at all; the Explanation Engine and Financial Tutor are separate, subsequent, optional endpoints. Verified directly by `test_create_explanation_with_no_provider_returns_safe_fallback` and `test_followup_question_with_no_provider_returns_safe_fallback`, both exercising the real default configuration (`AI_PROVIDER=none`) end-to-end through the actual HTTP stack, not a mock.
6. **Could repeated regeneration create cost abuse?** — Bounded by a per-simulation regeneration cap (Explanation Engine) and a separate per-simulation follow-up-question cap (Financial Tutor), both configurable, both verified to return `429 REGENERATION_LIMIT_EXCEEDED` once exceeded (`test_regeneration_cap_returns_429`, `test_followup_cap_returns_429`), on top of the existing 20/min `rate_limit_ai` bucket. **Residual risk (KI-033)**: the cap check has no row-level lock — a low-severity TOCTOU race mirroring KI-012/KI-027's already-accepted precedent, not a new class of issue.

**Red Team Review — additional adversarial questions**:

- *Could a malicious follow-up question break out of the prompt and cause the model to fabricate a number or give advice?* — Even if it did, both safety gates still run on the resulting output — an injected instruction cannot itself bypass `check_numeric_integrity`/`check_advice_language`, since those checks have no dependency on what produced the text they're scanning.
- *Could the AI's own output be used to attack the frontend (stored/reflected content risk)?* — `explanation_text` is stored and returned as plain text with Markdown-style `##` headers, never HTML — a requirement carried forward explicitly for the M7 (Frontend) design review, since M6 alone cannot enforce frontend rendering discipline.
- *Could an attacker force real provider spend by hammering the safe-fallback path?* — No: with the default `NullProvider`, no network call is ever made regardless of request volume; the 20/min rate limit bounds request volume itself even before any cap or provider cost is considered.
- *Does a `FAILED` row ever leak the reason it failed in a way that discloses something sensitive?* — `error_message` is always the literal, generic founder-approved safe string (`explanation_service.SAFE_UNAVAILABLE_MESSAGE`) — the specific exception type is recorded only in `audit_logs.details.error_type`, an operator-only surface, never returned to the API caller.

**Mitigations Implemented**: Structural input allowlisting (`_build_simulation_facts`); three post-generation safety gates rejecting outright rather than sanitizing; a code-appended (never model-generated) Educational Disclaimer; a `Protocol`-based provider abstraction with a `NullProvider` default; per-simulation regeneration/follow-up caps plus the existing rate limiter; SAVEPOINT-isolated, fail-open audit logging that never records generated content, raw questions, or fabricated values; a startup guard rejecting a real provider configured with no API key.

**Remaining Risks**: KI-032 (heuristic safety-check coverage gaps — the most consequential open item from this milestone), KI-033 (low-severity cap-check race), KI-034 (unverified provider-echoed-model-name assumption underlying the cache key, cost-inefficiency-only if wrong). KI-016 (carried from M3) remains the platform's single highest-priority open item, unrelated to this milestone.

**Threats Deferred**: Data poisoning and model manipulation remain the Founder Specification's own named-but-unmitigated future threats — correctly still deferred, since both only become live risks once a RAG knowledge corpus exists (Part 2.7.14), explicitly out of scope for M6 (Founder Decision 003). Supply chain risk is narrowed, not eliminated, by adding exactly one new pinned dependency (`anthropic==0.116.0`) reviewed before inclusion, not eliminated by policy alone.
