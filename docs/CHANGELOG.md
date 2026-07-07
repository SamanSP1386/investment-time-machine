# CHANGELOG.md

Semantic version history. Never rewrite history — new entries only. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md).

---

## [0.8.1] — 2026-07-16 — M7 Phase 1.5: Frontend Foundation Hardening

### Added
- `frontend/src/lib/format/` — the canonical financial-formatting layer: a branded `DecimalString` type, string-only (never `Number()`/`parseFloat()`/`parseInt()`) currency/percentage/date/date-range formatters, and explicit reason-coded nullable formatters (`formatNullableCurrency`/`formatNullablePercentage`) resolving the long-standing dual-meaning-null problem (`docs/frontend_design_system.md` §14 risk 7). Documented contract in `README.md`.
- `frontend/eslint.config.mjs` — a `no-restricted-syntax` rule banning `Number(`, `parseFloat(`, `parseInt(`, and unary `+` numeric coercion in `src/app/**`/`src/components/**`, enforcing the formatting layer's contract structurally (ADR-029).
- `frontend/src/lib/query/` — TanStack Query conventions fixed before any product page: a query-key factory (`keys.ts`) and a documented error-handling/invalidation convention (`README.md`), demonstrated end-to-end by `frontend/src/hooks/use-asset-search.ts`, a cross-cutting reference hook (ADR-032).
- `frontend/src/app/dev/playground/` — a dev-only visual verification surface rendering every primitive component and variant in both themes, guarded by `notFound()` in production (verified against both the actual compiled static output and an automated test).
- `frontend/src/lib/next-error-boundary.ts` — isolates Next.js's explicitly-unstable `unstable_retry` prop shape behind one shared type (ADR-031).
- `frontend/src/__tests__/lib/api-contract-drift.test.ts` — fetches the backend's live `/openapi.json` and asserts the field names this frontend depends on are present, skipping gracefully when no backend is reachable (ADR-030).
- 61 new tests: a known-answer WCAG contrast test, `axe-core` structural accessibility tests for every primitive, keyboard-operability tests, a reduced-motion mechanism check, format-module tests including a static-analysis guardrail, and query-key/hook tests. 103 tests total, 95%+ statement coverage.
- ADR-028 through ADR-032 (`docs/ARCHITECTURE_DECISIONS.md`).

### Changed
- `frontend/src/styles/tokens/{primitives,semantic}.css`: split muted-ink and all four status colors into verified light/dark pairs (ADR-028) — the original single-shared-hex design failed WCAG AA (4.5:1) as text color in at least one theme for three of four status colors plus muted-ink, and separately contained a self-referencing CSS custom property that would have silently broken Badge's status-color differentiation.
- `frontend/src/types/api.ts`: `GrowthSeriesPoint`/`DisclosedSplit`'s date fields corrected to `point_date`/`split_date` (were wrongly guessed as `date`); six `SimulationResponse` fields corrected to nullable (`DecimalString | null`, were wrongly typed as always-present); added the previously-missing `error_message` field. All financial fields now typed `DecimalString`, not `string`. Confirmed against the real backend schema, both by reading source and via a live, running backend (KI-036/KI-038, ADR-030).
- `docs/frontend_design_system.md` §3: status/muted color table updated to match ADR-028's corrected values.
- `frontend/next.config.ts`: `turbopack.root` pinned explicitly (unrelated build-warning fix noticed in passing).

### Fixed
- A shipped WCAG contrast failure and a self-referencing CSS bug in the status-color design tokens (KI-037, ADR-028) — found before any product page consumed them.
- Real API-contract drift between the frontend's hand-written types and the actual backend response shape (KI-036, KI-038, ADR-030) — found before any product page consumed the affected types.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Verified (not changed): `SameSite` is evaluated by registrable site, not port, so local dev cross-port requests correctly carry session cookies; CORS/cookie configuration matches Founder Decision 002/ADR-018 exactly (`docs/SECURITY_LOG.md`'s M7 Phase 1.5 entry).
- KI-039 added: the production custom-domain requirement `SameSite=Strict` depends on (per ADR-018) is assumed but never enforced or verified anywhere — a real pre-launch blocker if the platform ships on default hosting-provider subdomains.
- KI-040 added: a forward-looking note on the theme-flash-prevention inline script's future CSP interaction (hash-based allow-listing preferred over nonces, to avoid forcing the app into dynamic rendering) — no CSP exists yet.

---

## [0.8.0] — 2026-07-15 — M7 Phase 1: Frontend Foundation

### Added
- `frontend/` — the platform's first frontend code, scaffolded with Next.js 16.2.10 (App Router, TypeScript, Tailwind v4).
- Design token system: `src/styles/tokens/{primitives,semantic,components}.css` (three-layer, runtime-switchable CSS custom properties) bridged into Tailwind v4's `@theme inline` in `globals.css` — covers brand/neutral/chart/status/AI color families, type scale, spacing (Tailwind's default 4px scale, unmodified), radius, elevation, motion durations/easings, and a new six-tier z-index scale.
- Theme system: `src/providers/{theme-provider,theme-script}.tsx` — `data-theme` attribute switching with a synchronous inline `<head>` script (this Next.js version's own documented flash-prevention pattern), a `useTheme()`/`setTheme()` hook, and no rendered toggle yet (deliberate, per `docs/BRAND_CONSTITUTION.md`).
- Shared providers: `src/providers/{query-provider,toast-provider,app-providers}.tsx` (TanStack Query with sensible defaults, a calm toast/notification system, and one composition point), plus `src/app/{error,global-error,not-found}.tsx` (Next 16.2's `unstable_retry`-based error boundaries).
- API layer: `src/lib/api/{client,errors,index}.ts` and `src/lib/api/endpoints/{assets,simulations}.ts` — one Axios instance (`withCredentials: true`), one `apiRequest<T>()` entry point, one pure `normalizeApiError()` function, one `ERROR_COPY` table covering every documented backend error code plus a client-only `NETWORK_ERROR`, and a Zod schema (`simulationCreateSchema`) matching the simulation-creation request contract. `src/types/api.ts` mirrors `docs/api_design.md`/`backend/app/models/enums.py` exactly, keeping every financial figure a `string` end-to-end.
- Eight primitive components (`src/components/ui/`): Button, Input, Card, Badge, Skeleton, EmptyState, ErrorState, StatTile — each reviewed against `docs/BRAND_CONSTITUTION.md`'s Component Review Checklist (hairline-only dividers, icon+label badges, tabular numerals, a keyboard-operable `<details>`-based provenance disclosure on StatTile, `role="alert"`/`aria-invalid`/`aria-describedby` wiring).
- The platform's first frontend test suite: 42 tests across 15 files (Vitest + React Testing Library + jsdom), 94.26% statement coverage — above `.claude/TESTING_GUIDELINES.md`'s 60%+ target.
- ADR-025 through ADR-027 (`docs/ARCHITECTURE_DECISIONS.md`): the token-architecture/Tailwind-v4 bridge, the theme-switching strategy, and the centralized API client design.

### Changed
- `.gitattributes`: explicit LF rules added for frontend source file types (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.mts`, `.cjs`, `.json`, `.css`), resolving KI-010 now that frontend source genuinely exists.
- `docs/PROJECT_STATE.md`: version bumped to 0.8.0; M7 Phase 1 marked complete; Next Milestone updated to M7 Phase 2 (product screens, starting with Simulator → Results).

### Fixed
- N/A (no prior milestone's code was touched; this is new, additive frontend scaffolding only).

### Removed
- The `create-next-app` default placeholder page and unused template SVG assets (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`).

### Deprecated
- N/A.

### Security
- Session handling: `apiClient` sets `withCredentials: true` and never reads, stores, or attaches a token itself — no `localStorage`/`sessionStorage` token handling exists anywhere, by construction (Founder Decision 002's httpOnly-cookie design made a frontend token store unnecessary).
- Exactly one `dangerouslySetInnerHTML` exists (the theme-flash-prevention script), injecting a fixed, source-controlled string with no interpolated user data.
- `frontend/src/config/env.ts` validates its one environment variable with Zod at module load and fails fast on misconfiguration, mirroring the backend's own `Settings` validation philosophy.
- KI-036 added (an inferred, unverified `growth_series` per-point type shape — low severity, data-modeling risk, not a security one).

---

## [0.7.2] — 2026-07-14 — M7 Phase 0 Follow-up: Founder Decision 004 Formalized (Documentation Only)

### Added
- `docs/FOUNDER_DECISIONS.md`: **Founder Decision 004** — consolidates the nine brand/scope decisions from `docs/BRAND_CONSTITUTION.md` §3 (visual design system approval, theme architecture, M7 feature scope exclusions, minimal Account/Settings scope, growth-chart consistency as a backend precondition, anonymous educational AI access and its rate-limit-not-access-gate principle, trust/education over excitement, confidence without ego) into the project's own append-only Founder Decision ledger, following the exact structure of Decisions 001–003. Decisions 001–003 are unchanged.

### Changed
- `docs/PROJECT_STATE.md`: version bumped to 0.7.2; Current Milestone and Open Founder Decisions now cite "Founder Decision 004" directly rather than the constitution's informal `FD-00N` labels.

### Fixed
- Closed the documentation-consistency gap the 0.7.1 entry explicitly disclosed (brand decisions recorded only inside `docs/BRAND_CONSTITUTION.md`, not yet mirrored into `docs/FOUNDER_DECISIONS.md`'s own numbering).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- N/A — no code or infrastructure changed.

---

## [0.7.1] — 2026-07-13 — M7 Phase 0: Design Foundation (Documentation Only)

### Added
- `docs/BRAND_CONSTITUTION.md` — the authoritative source of truth for Investment Time Machine's visual identity and brand philosophy: brand philosophy/personality, Founder Decisions FD-004 through FD-012 (including new FD-012, "Confidence Without Ego"), visual/typography/color/motion/UX philosophy, writing style guide, a component review checklist, and an explicit "things we never do" list. Consolidates a three-part M7 Phase 0 design review (initial design system, a skill-validated pressure test using the `ui-ux-pro-max`/`design-system` skills, and a brand-identity deep-dive) into one single-authored standard, superseding those reviews' brand-level conclusions. `docs/frontend_design_system.md` remains the implementation-level design system (tokens, component specs, page inventory) and is now explicitly subordinate to this constitution.

### Changed
- `docs/PROJECT_STATE.md`: version bumped to 0.7.1; M7 Phase 0 marked complete; Next Milestone updated to M7 Phase 1 (design token and shared-primitive implementation only, no pages); FD-004–012 noted under Open Founder Decisions pending formal `FOUNDER_DECISIONS.md` numbering.

### Fixed
- N/A (no application code changed).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- N/A — no code or infrastructure changed; brand/UX guidance reinforces existing product-level trust commitments (e.g., the AI panel must never visually imply greater authority than the Simulation Engine's calculated output) but introduces no new technical control.

---

## [0.7.0] — 2026-07-12 — M6: Educational AI System

### Added
- `app/ai/` — the Educational AI domain module, HTTP/DB-blind (mirrors `app.auth`'s shape): `exceptions.py` (`AIProviderUnavailableError`, `AIOutputStructureError`, `AIIntegrityViolationError`, `AIUnsafeContentError`), `prompt.py` (fixed, versioned system prompts for the Explanation Engine and Financial Tutor — no user text ever concatenated into a system prompt), `safety.py` (three post-generation gates: six-section structure check, numeric-integrity check against the simulation's own structured output, advice-language check), `providers/` (`AIProvider` Protocol mirroring the ingestion milestone's capability-protocol precedent, `AnthropicProvider`, `NullProvider`, a `Settings`-driven factory), `service.py` (`generate_explanation`, `generate_followup_answer` — orchestrates prompt → provider → safety gates → the code-appended Educational Disclaimer).
- Migration `0003_ai_explanation_type`: extends `ai_explanations` with `explanation_type` (`initial`/`follow_up`) and a nullable `question_text`, plus a composite index — no new table, no change to `simulations` or any other domain.
- Three new endpoints: `POST /api/v1/simulations/{id}/explanations` (get-cached-or-generate; `regenerate: true` forces a fresh attempt, capped), `GET /api/v1/simulations/{id}/explanations` (list all attempts), `POST /api/v1/simulations/{id}/explanations/questions` (Financial Tutor follow-up, capped, cached by identical normalized question text).
- `app/api/v1/services/explanation_service.py`: owns the simulation ownership/completion checks (reusing `simulations`' existing access rule), the PII-free `simulation_facts` allowlist construction, caching, regeneration/follow-up caps, and audit logging — the API-layer half of the `app.ai`/`explanation_service` split.
- `app/api/v1/audit.py::record_ai_audit`: one `audit_logs` row per generation attempt, success or failure, using `AuditEventType.AI_EXPLANATION_GENERATED`/`_FAILED` (reserved in the schema since M1, unused until now) — mirrors the existing SAVEPOINT-isolated, fail-open pattern exactly; never includes the generated text, the raw question, or any offending fabricated value.
- `app/api/v1/dependencies.py::rate_limit_ai` — 20/min (Founder Specification Part 2.8.13), reusing the existing Redis-backed `RateLimiter` unchanged.
- `app/core/config.py`: `ai_provider` (default `"none"`), `ai_provider_api_key`, `ai_model_name`, `ai_max_output_tokens`, `ai_request_timeout_seconds`, `rate_limit_ai_per_minute`, `ai_max_explanation_regenerations`, `ai_max_followup_questions`, plus a `model_validator` rejecting a real provider configured with no API key (mirrors ADR-020's `JWT_SECRET` guard).
- 55 new tests: `tests/ai/` (38, no network/DB — safety gates, prompt construction, service orchestration against a fake provider, the Anthropic adapter against a mocked SDK client), `tests/core/test_ai_config.py` (4), `tests/api/test_explanations.py` (17, HTTP-integration against the real DB — cache hits, regeneration/follow-up caps, ownership/completion checks, audit logging, and the safe-fallback path exercised for free via the default `NullProvider`).
- ADR-021 through ADR-024 (`docs/ARCHITECTURE_DECISIONS.md`) and Founder Decision 003 (`docs/FOUNDER_DECISIONS.md`).
- `docs/MILESTONE_REPORTS/M6_REPORT.md`, `docs/PROJECT_STATE.md`.

### Changed
- `requirements.txt`: added `anthropic`.
- `.env.example`: added the eight M6 environment variables listed above.
- `.claude/SECURITY_POLICY.md`: prompt-injection gap note updated — addressed at M6 (structural defense, not just a documented risk); residual heuristic gaps tracked as KI-032.
- `.claude/DATABASE_RULES.md`: `ai_explanations` table description updated to reflect the M6 schema extension.
- `docs/KNOWN_ISSUES.md`: KI-032, KI-033, KI-034 added (heuristic safety-check limitations, a low-severity cap-check TOCTOU race mirroring KI-012/KI-027's precedent, and an unverified provider-model-name caching assumption).

### Fixed
- N/A (no prior milestone code touched beyond the additive wiring noted above; the Simulation Engine was not modified in any way, per direct instruction).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- AI never calculates, modifies, forecasts, recommends, or invents a financial fact — enforced structurally (`app.ai` has no import path to `app.simulation` or any write-capable session), not just by prompt wording.
- Prompt-injection defense: the system prompt is a fixed, source-controlled string for every request; a follow-up question's raw text is placed only inside a clearly delimited data block in the user turn, never merged into the system prompt.
- Privacy: the AI provider never receives email, display name, user ID, IP address, session ID, request ID, or auth information — verified by `_build_simulation_facts`' exhaustive allowlist and a dedicated audit-log test confirming the generated text itself never leaks into `audit_logs.details`.
- AI availability: every generation failure returns a normal, successful HTTP response carrying the literal founder-approved safe message — the simulation itself, and every other endpoint, is entirely unaffected by an AI outage.
- Three residual risks documented, not fully closed, as deliberate tracked debt: KI-032 (heuristic safety checks are not exhaustive), KI-033 (a low-severity cap-check race under genuine concurrency), KI-034 (an unverified provider-echoed-model-name assumption underlying the cache key).

---

## [0.6.0] — 2026-07-11 — M5: Identity Management (Authentication)

### Added
- `app/auth/` — the Identity Management domain module: `exceptions.py` (explicit error taxonomy — `EmailAlreadyRegisteredError`, `WeakPasswordError`, `InvalidCredentialsError`, `AccountLockedError`, `AccountInactiveError`, `InvalidRefreshTokenError`, `RefreshTokenReuseDetectedError`, `InvalidAccessTokenError`), `password.py` (Argon2 hashing, an 8-character minimum floor, timing-parity dummy-hash comparison against account enumeration), `tokens.py` (15-minute JWT access tokens, opaque 256-bit refresh tokens hashed with SHA-256 before storage), `lockout.py` (Redis-backed, per-account failure counter — 5 attempts / 15-minute window, distinct from IP-based rate limiting), `repository.py` and `service.py` (`register_user`, `authenticate`, `refresh_session`, `logout`, `issue_session_for_user` — the sole orchestration entry points).
- `app/models/refresh_token.py` + migration `0002_refresh_tokens`: a new `refresh_tokens` table (opaque-token-hash storage, rotation chain via `replaced_by_id`, `user_agent`/`ip_address` captured for a future multi-device-session feature).
- Four new endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` — all session state delivered via httpOnly, Secure, `SameSite=Strict` cookies, never in a JSON response body.
- `app/api/v1/dependencies.py`: `get_current_user_optional`, `get_current_user_required`, `get_current_admin_user` — authentication/authorization middleware, re-verifying the user against the database on every request rather than trusting the JWT's `is_admin` claim blindly.
- `app/core/config.py`: a `model_validator` rejecting the default `JWT_SECRET` placeholder outside `development`/`test` environments — a red-team-driven fix, not a design-review item.
- 62 new tests across `tests/auth/`, `tests/api/test_auth.py`, `tests/api/test_dependencies.py`, `tests/core/test_config.py` — unit, DB-integration, and HTTP-integration, including a dedicated refresh-token-reuse multi-device scenario and an HTTP-level account-enumeration-resistance check.
- ADR-017 through ADR-020 (`docs/ARCHITECTURE_DECISIONS.md`) and Founder Decision 002 (`docs/FOUNDER_DECISIONS.md`).
- `docs/MILESTONE_REPORTS/M5_REPORT.md`, `docs/PROJECT_STATE.md`.

### Changed
- `app/api/v1/routers/simulations.py`: `POST /api/v1/simulations` now attaches `user_id` opportunistically when a valid session is present (anonymous creation remains fully supported); `GET /api/v1/simulations/{id}` now enforces real ownership via `get_current_user_optional` instead of M4's fail-closed placeholder.
- `app/api/v1/audit.py`: added `record_auth_audit`, reusing `AuditEventType.USER_REGISTERED`/`USER_LOGIN_SUCCEEDED`/`USER_LOGIN_FAILED`/`USER_LOGOUT` (all already present in the M1 schema, ahead of this milestone).
- `app/api/v1/exception_handlers.py`: seven new exception-to-envelope mappings (`EMAIL_ALREADY_REGISTERED` 409, `WEAK_PASSWORD` 422, `INVALID_CREDENTIALS` 401, `ACCOUNT_LOCKED` 429, `ACCOUNT_INACTIVE` 403, `INVALID_REFRESH_TOKEN` 401, `UNAUTHORIZED` 401).
- `app/models/user.py`: added the `refresh_tokens` relationship.
- `requirements.txt`: added `argon2-cffi`, `pyjwt`, `email-validator`.
- `.claude/SECURITY_POLICY.md`, `.claude/DATABASE_RULES.md`: updated to reflect Founder Decision 002 and the new `refresh_tokens` table.
- `docs/KNOWN_ISSUES.md`: KI-006 resolved, KI-023 updated (middleware now exists; endpoints themselves still deferred), KI-027–KI-031 added.

### Fixed
- N/A (no prior milestone code touched beyond the `simulations.py` router wiring noted above).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Argon2 password hashing (Founder Specification Part 2.8.5), never plaintext, never a hint or security question.
- Account enumeration resistance: login returns the identical status/code/message whether the email is unknown or the password is wrong, verified at both the service layer and the HTTP layer; a wrong password against a suspended account still yields the generic error, never revealing suspension status to an unauthenticated guesser.
- Refresh-token rotation with reuse detection: a replayed, already-rotated token revokes every active session for that user, not just the one presented.
- httpOnly/Secure/SameSite=Strict cookies close off JS-readable token theft (XSS) and cross-site request forgery on the session cookies.
- Fixed during self-review, not just documented: a forgotten `JWT_SECRET` env var in a real deployment would have allowed silent token forgery — now a hard startup failure outside development/test.
- Four residual risks documented, not fixed, as deliberate tracked debt: KI-027 (low-severity concurrent-refresh race), KI-028 (inherent access-token non-revocability window), KI-029 (lockout retry-after not surfaced), KI-031 (password reset itself, deliberately out of scope per direct instruction).

---

## [0.5.1] — 2026-07-10 — M4 Follow-Up: Simulation Audit Logging (KI-026)

### Added
- `app/api/v1/audit.py`: `record_simulation_audit` (writes one `audit_logs` row per `POST /api/v1/simulations` attempt — success, pre-flight validation error, or mid-simulation error — inside a SAVEPOINT, swallowing `SQLAlchemyError` so a broken audit write can never turn a correct response into a 500) and `record_simulation_request_validation_audit` (best-effort audit write for Pydantic-level request validation failures, which never reach the service layer at all).
- 4 new tests (`tests/api/test_simulation_audit.py`): audit row written on success, on `AssetNotFoundError`, on `MissingHistoricalDataError` (asserting the audit row's `entity_id`/`details.simulation_id` match the persisted failed `Simulation` row), and on a Pydantic request-validation failure.

### Changed
- `app/api/v1/services/simulation_service.py::create_simulation`: now records an audit entry on every code path (success, the three pre-flight errors, the two mid-simulation errors); accepts a new required `request_id` keyword argument.
- `app/api/v1/routers/simulations.py`: threads the request's `X-Request-ID` (via `app.core.request_id.get_request_id`) into the service call.
- `app/api/v1/exception_handlers.py`: `RequestValidationError` handler now calls `record_simulation_request_validation_audit`, scoped to `POST /api/v1/simulations` only.
- `docs/KNOWN_ISSUES.md`: KI-026 resolved.

### Fixed
- KI-026: `docs/api_design.md`'s stated audit-logging requirement for `POST /api/v1/simulations` is now implemented (with one documented, deliberate deviation — no new `SIMULATION_FAILED` enum value was added; the existing `SIMULATION_CREATED` value is reused with `status`/`error_code` inside `details`, since adding an enum value requires a migration judged out of scope for this fix).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Every `POST /api/v1/simulations` attempt (success or failure, including requests that fail Pydantic validation before reaching any business logic) now leaves an audit trail — directly serving Founder Specification Part 2.8.14. The audit write is isolated (SAVEPOINT, swallowed `SQLAlchemyError`) so it cannot become a new availability risk for the simulation feature itself.

---

## [0.5.0] — 2026-07-10 — M4: API Layer

### Added
- `app/api/v1/` — the platform's first HTTP API surface: Pydantic schemas (`schemas/common.py` response envelope + Decimal-safe serialization, `schemas/assets.py`, `schemas/simulations.py`), service layer (`services/asset_service.py`, `services/simulation_service.py`), API-layer-only errors (`errors.py`: `SimulationNotFoundError`, `ForbiddenError`, `RateLimitExceededError`), FastAPI dependencies (`dependencies.py`: DB session, rate-limit checks), routers (`routers/assets.py`, `routers/simulations.py`), and `exception_handlers.py` mapping every named exception to the standard `{"success": false, "error": {...}}` envelope with the correct HTTP status.
- Six endpoints: `GET /api/v1/assets` (search), `GET /api/v1/assets/{symbol}` (detail), `GET /api/v1/assets/{symbol}/availability`, `POST /api/v1/simulations` (create, public/anonymous for MVP), `GET /api/v1/simulations/{id}` (retrieve).
- `app/simulation/formulas.py::calculate_growth_series` — extends the Simulation Engine (not the API layer) with Founder Specification Part 3.3.2's required "Growth Chart" output, wired into `SimulationOutcome.growth_series` via a new `SimulationRepository.get_prices_ordered` method.
- `app/core/request_id.py` — per-request UUID middleware (`X-Request-ID` response header, used for error-response correlation without leaking internals to the client).
- `app/core/rate_limit.py` — Redis-backed fixed-window `RateLimiter` (fails open with a logged warning if Redis is unreachable, mirroring the Founder Specification's AI-failure-isolation philosophy applied by analogy); Redis added to `docker-compose.yml`, `Settings`, `.env.example`, `requirements.txt`.
- 26 new tests: 5 pure-formula growth-series tests + 1 DB-integration engine test (`tests/simulation/`), 4 rate-limiter unit tests (`tests/core/test_rate_limit.py`), 7 asset-endpoint and 9 simulation-endpoint integration tests (`tests/api/`, using FastAPI's `TestClient` against the real DB via transaction-rollback fixtures).
- ADR-016 (`docs/ARCHITECTURE_DECISIONS.md`): service-owned transaction boundary, engine-computed growth series, savepoint-nested test sessions.
- `docs/MILESTONE_REPORTS/M4_REPORT.md`.

### Changed
- `app/main.py`: mounts the v1 router under `/api/v1`, registers all exception handlers, adds `RequestIDMiddleware` and CORS middleware. The M0 `/health` endpoint is unchanged and unversioned.
- `app/simulation/exceptions.py`: `SimulationError` base now carries an optional `simulation_id`, populated for `MissingHistoricalDataError`/`CalculationError` (the two error types where a failed `Simulation` row is already persisted before the exception propagates) so the API error response can reference the stored record.
- `pyproject.toml`: added `flake8-bugbear`'s `extend-immutable-calls` for `fastapi.Depends`/`fastapi.Query` (FastAPI's own DI idiom, not the mutable-default-value bug B008 otherwise guards against).
- `docs/api_design.md`, `docs/KNOWN_ISSUES.md` (KI-021 resolved with a documented remaining gap, KI-022/023/024 resolved per explicit founder decision, KI-025/026 added), `docs/FOUNDER_DECISIONS.md` context — see M4 report for the full compliance detail.

### Fixed
- N/A (no prior milestone code touched beyond the `exceptions.py`/`engine.py` extensions noted above).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Rate limiting (60/min simulation creation, 100/min reads) is the MVP-appropriate control for the public, unauthenticated `POST /api/v1/simulations` endpoint, per explicit founder decision (KI-022).
- Every named exception type maps to an explicit, reviewed HTTP status and error code; the one legitimate boundary-level catch-all (`Exception` → 500 `INTERNAL_SERVER_ERROR`) logs full detail server-side and returns only a generic message plus a `request_id` to the client.
- No admin or authentication-requiring endpoints implemented or exposed (Simulation History, Admin Import deferred to M5 per founder decision — KI-023).
- **Known gap, not yet fixed**: `docs/api_design.md`'s stated audit-logging requirement for simulation creation was not implemented in this pass — tracked as KI-026.

---

## [0.4.0] — 2026-07-09 — M3: Simulation Engine

### Added
- `app/simulation/exceptions.py`: explicit error taxonomy (`AssetNotFoundError`, `InvalidDateRangeError`, `InvalidInvestmentAmountError`, `MissingHistoricalDataError`, `CalculationError`), matching Founder Specification Part 2.14.14 exactly.
- `app/simulation/precision.py`: scoped `decimal.localcontext()` (`prec=38`, `ROUND_HALF_EVEN`), currency/percentage quantization helpers.
- `app/simulation/formulas.py`: pure, DB-free calculations — shares purchased, final value, total return %, CAGR, inflation-adjusted value, dividend reinvestment loop — every formula cited to its exact Founder Specification section.
- `app/simulation/repository.py`: read-only Simulation Engine data access (exact-date price lookup, ordered dividend/split retrieval, as-of CPI lookup).
- `app/simulation/engine.py`: `run_simulation` — the sole orchestration entry point (Input Validation → Historical Data Retrieval → Calculation → Result Generation → Storage), implementing Founder Decision 001 (`close_price` primary, `adjusted_close_price` never read, `stock_splits` disclosure-only).
- 36 new tests across `tests/simulation/`: pure-formula known-answer tests (several reproducing the Founder Specification's own worked examples verbatim), Decimal precision/rounding tests, DB-integration known-answer tests, determinism tests, error-handling tests, and split-disclosure tests.
- `docs/FOUNDER_DECISIONS.md` (Founder Decision 001) and ADR-015 (M3 design review turn — already recorded prior to this implementation pass).
- `docs/MILESTONE_REPORTS/M3_REPORT.md`.

### Changed
- `docs/simulation_formulas.md`: status updated to IMPLEMENTED; corrected §2 — dividends are ignored entirely (not tracked as uninvested cash) when `dividends_reinvested = false`, matching Founder Specification 2.14.10/3.3.3 precisely.
- `docs/KNOWN_ISSUES.md`: KI-016 updated (code behavior verified; live-data empirical claim remains open with a documented manual verification runbook), KI-017/018 resolved, KI-019/020 added.

### Fixed
- N/A (no prior milestone code touched).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- No new attack surface (no API endpoints, no user input parsing beyond function arguments). `run_simulation` never executes AI-generated or live-fetched data — only already-validated, already-stored rows (Founder Specification Part 2.14.6).

---

## [0.3.0] — 2026-07-07 — M2: Historical Data Ingestion Pipeline

### Added
- Provider Layer (`app/ingestion/providers/`): `YFinanceProvider` (stocks/ETFs — prices, dividends, splits), `CoinGeckoProvider` (crypto — prices), `FredProvider` (economic indicators — observations). Capability protocols (`PriceProvider`, `DividendProvider`, `SplitProvider`, `IndicatorProvider`) let the orchestrator query what each provider supports rather than assuming a uniform interface.
- Validation Layer (`app/ingestion/validation/`): per-record-type validators returning explicit rejection reasons; in-batch duplicate detection.
- Normalization Layer (`app/ingestion/normalization/`): provider-shaped records → platform-standard dicts (Decimal-typed, upper-cased symbols/currency).
- Storage Layer (`app/ingestion/storage/`): `IngestionRepository` — idempotent upserts (`ON CONFLICT DO NOTHING`) per table, asset/indicator resolution, per-record SAVEPOINT isolation.
- Audit Layer (`app/ingestion/audit/`): one `audit_logs` row per real import attempt (success/failure), never written during a dry run.
- Import Report (`app/ingestion/reports/`): structured, reusable summary (provider, target, row counts, warnings, errors, status, duration) for every import.
- Orchestrator (`app/ingestion/orchestrator.py`): `import_asset_prices`, `import_asset_dividends`, `import_asset_splits`, `import_economic_indicator`, `import_asset` (convenience wrapper) — full dry-run support with no database writes.
- Explicit exception hierarchy (`app/ingestion/exceptions.py`): `ProviderUnavailableError`, `NetworkTimeoutError`, `InvalidSymbolError`, `UnexpectedProviderResponseError`, `DatabaseConstraintError`.
- CLI entrypoint (`app/ingestion/cli.py`) for manually triggering imports — not an API endpoint, no auth, no scheduler.
- Core Configuration Layer addition: `app/core/database.py` (engine/session factory, `session_scope` context manager) — the only place a SQLAlchemy `Engine` is constructed.
- 63 new tests: provider adapters (mocked, no live network calls), validation rules, normalization, Import Report, and DB-integration tests for storage/audit/orchestrator (dry-run, real-run, idempotency, provider-failure handling).
- ADR-011 through ADR-014 (provider capability protocols, CoinGecko OHLC disclosure, per-record SAVEPOINT, single-audit-row-per-import design).

### Changed
- `.env.example`, `backend/app/core/config.py`: added `FRED_API_KEY`, `INGESTION_HTTP_TIMEOUT_SECONDS`.
- `backend/requirements.txt`: added `yfinance`, `httpx`, `requests`.

### Fixed
- N/A.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- All provider data treated as untrusted until validated; no provider adapter has database access (enforced by module boundaries).
- FRED API key sourced from environment only, never logged or hardcoded.
- No raw/string-interpolated SQL anywhere in the ingestion pipeline — all writes go through parameterized SQLAlchemy Core/ORM constructs.
- CoinGecko's OHLC approximation (a data-fidelity limitation of the free API tier) is disclosed via an Import Report warning on every affected import, never silently presented as genuine intraday data.

---

## [0.2.2] — 2026-07-07 — CI Reliability Fix: Stable Secret Scanning

### Added
- N/A.

### Changed
- `.github/workflows/ci.yml`: `secret-scan` job now installs and runs the `gitleaks` CLI directly (`gitleaks detect --source . --redact --verbose`, pinned v8.18.4) instead of `gitleaks/gitleaks-action@v2`, scanning the repository's full git history unconditionally rather than an event-inferred commit range.

### Fixed
- CI `secret-scan` job no longer fails with an ambiguous-commit-range error after a merge or unrelated-history pull. Root cause was the wrapper action's range inference, not a detected secret — see `docs/KNOWN_ISSUES.md` KI-011 (resolved).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Secret-scanning coverage unchanged or stronger (full history scan every run, not a diff range). No leak was ever missed by the prior bug — it was a false-positive CI failure.

---

## [0.2.1] — 2026-07-06 — Repository Hygiene Pass

### Added
- `.gitattributes`: LF forced for `.py`/`.md`/`.yml`/`.yaml`/`Dockerfile`/`.sh`; CRLF forced for `.bat`/`.ps1`; explicit `binary` declarations for `.pdf`/`.docx`/common image formats.
- `.editorconfig`: UTF-8, LF, 4-space indentation, required final newline, trailing-whitespace trimming (Markdown exempted for intentional line breaks); CRLF override for `.bat`/`.ps1` to match `.gitattributes`.
- Five hygiene hooks from `pre-commit/pre-commit-hooks` (trailing-whitespace, end-of-file-fixer, mixed-line-ending, check-merge-conflict, check-added-large-files, check-yaml, check-toml).
- ADR-010: rationale for standardizing on LF line endings project-wide.

### Changed
- `.gitignore`: added `.mypy_cache/`, `.coverage.*`, `*.log`, `*.bak`, `*.orig`, `*.rej`.

### Fixed
- N/A — no application behavior changed.

### Removed
- Stray nested `backend/.git/` directory (empty, commit-less, remote-less — confirmed zero history before removal).

### Deprecated
- N/A.

### Security
- `check-added-large-files` pre-commit hook now guards against accidentally committing an oversized binary.
- No secrets, credentials, or application security surface touched by this pass.

---

## [0.2.0] — 2026-07-05 — M1: Database Schema & Migrations

### Added
- SQLAlchemy 2.0 models for all nine Founder Specification database domains (ten tables — `app/models/`): `Asset`, `HistoricalPrice`, `Dividend`, `StockSplit`, `EconomicIndicator`, `EconomicIndicatorValue`, `User`, `Simulation`, `AuditLog`, `AIExplanation`.
- Five native PostgreSQL ENUM types: `asset_type_enum`, `simulation_status_enum`, `ai_generation_status_enum`, `auth_method_enum`, `audit_event_type_enum`.
- Initial Alembic migration (`0001_initial_schema`) creating all enums, tables, constraints, and indexes.
- Shared naming-convention metadata (`idx_<table>_<column>`, `fk_<table>_<referenced_table>`, etc.) enforced automatically via SQLAlchemy's `MetaData(naming_convention=...)`.
- `pg_enum()` helper ensuring native enum labels use lowercase `.value` strings, not Python enum member names.
- 27 tests: 25 metadata-only model tests (no DB required) plus 2 DB-integration tests that apply the real migration to a live Postgres and assert zero drift against the models.
- Postgres service added to CI (`.github/workflows/ci.yml`) so migrations and DB-integration tests run for real on every push/PR.
- Derived ERD (`docs/erd.md`, Mermaid diagram + relationship notes).
- ADR-008 (Economic Indicators design) and ADR-009 (`audit_logs.user_id` delete behavior).

### Changed
- `.claude/DATABASE_RULES.md` updated to reflect the implemented schema rather than open gaps.
- `docs/setup_guide.md` updated with migration commands and a note on the test/dev-database interaction (KI-009).

### Fixed
- Approved fix: `calculation_version` present on `simulations` from migration 1 (not deferred).
- Approved fix: `simulations` and `ai_explanations` output columns are nullable (pending/failed states have no output yet) — corrects a Founder Specification internal inconsistency (NOT NULL columns alongside a status enum permitting no-output states).
- Approved fix: `users.password_hash` nullable with `auth_method` discriminator, for future OAuth support.
- Real bug caught during implementation: SQLAlchemy's `Enum(PyEnum)` defaults to storing the Python enum **member name** (e.g. `"STOCK"`), not `.value` (e.g. `"stock"`) — fixed via the `pg_enum()` helper before it reached a migration.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- `audit_logs.entity_id` (polymorphic) intentionally has no FK — documented exception, not a precedent.
- `audit_logs.user_id` uses `ON DELETE SET NULL` so the audit trail survives user account deletion (ADR-009).
- `ip_address` (PII) stored on `audit_logs` with no schema-level redaction/retention — flagged as an application-layer responsibility, not solved here.

---

## [0.1.0] — 2026-07-02 — M0: Repository & Environment Foundation

### Added
- FastAPI application skeleton (`app/main.py`) with a `/health` endpoint.
- Core Configuration Layer: centralized `Settings` (pydantic-settings) and startup logging configuration.
- PostgreSQL service via Docker Compose; backend Dockerfile.
- Alembic initialized (no models/migrations yet — infrastructure only).
- pytest smoke test for `/health` (1 test, passing).
- ruff, black, and pytest configuration (`pyproject.toml`).
- pre-commit hooks: ruff, black, gitleaks.
- GitHub Actions CI: lint, format-check, test, secret scan.
- `.env.example`, `.gitignore`, `docs/setup_guide.md`.

### Changed
- N/A (first release).

### Fixed
- N/A (first release).

### Removed
- N/A (first release).

### Deprecated
- N/A.

### Security
- gitleaks secret scanning added to both CI and local pre-commit, active from the first commit.
- No secrets committed; all configuration sourced from environment variables via `Settings`, never read directly from `os.environ` elsewhere in the codebase.
