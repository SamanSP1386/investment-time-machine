# KNOWN_ISSUES.md

Tracks all unresolved issues. Resolved issues remain in this document with a Resolution Date — never deleted. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md).

---

### KI-001

- **Description**: `docker compose up --build` has not been executed end-to-end against a running Docker daemon; the backend was instead verified independently (venv, ruff, black, pytest) because no Docker daemon was available in the session that authored `docker-compose.yml`.
- **Severity**: Low
- **Status**: Open — Partially Verified
- **Update (M1, 2026-07-05)**: A live Postgres 16 instance matching `docker-compose.yml`'s exact credentials (`itm_user`/`itm_dev`) was reachable at `localhost:5432` during the M1 session, and `alembic upgrade head` was run against it successfully (all 10 tables created, verified via introspection, then a full upgrade/downgrade round-trip confirmed zero drift against the models). This strongly indicates the Postgres service in `docker-compose.yml` is functioning correctly. It does not confirm the **backend container image** builds and runs correctly, since the `docker` CLI itself remains unavailable in this environment — only the Postgres service has been indirectly exercised.
- **Planned Resolution**: Run `docker compose up --build` (the full stack, including the backend image) and confirm `/health` responds before or during M2.
- **Resolution Date**: —

### KI-002

- **Description**: Local development Python observed as 3.11.9; the project targets 3.12+ (ruff/black configured for `py312`, CI pins `3.12`).
- **Severity**: Low
- **Status**: Open
- **Planned Resolution**: Ensure all local dev environments and CI runners use Python 3.12+; CI already pins this correctly.
- **Resolution Date**: —

### KI-003

- **Description**: Founder Specification Part 2.9 — API Architecture was never written in the source document (referenced twice as "Next:" but the document jumps straight to Part 2.10). `.claude/API_STANDARDS.md` fills the gap conservatively but it is provisional, not founder-approved.
- **Severity**: Medium
- **Status**: Open — Pending Founder Approval
- **Planned Resolution**: Founder review of `.claude/API_STANDARDS.md` at or before the API Layer milestone (M4).
- **Resolution Date**: —

### KI-004

- **Description**: Founder Specification Part 2.6.27 — Entity Relationship Design was never written. No consolidated ERD exists in the source spec.
- **Severity**: Low
- **Status**: Derived Artifact Produced — Pending Founder Approval
- **Update (M1, 2026-07-05)**: A derived ERD was produced at `docs/erd.md`, generated from the actual `backend/app/models/` SQLAlchemy models (Mermaid diagram + relationship notes). It is implementation-complete but not founder-reviewed.
- **Planned Resolution**: Founder review of `docs/erd.md`; supersede this status once approved or amended.
- **Resolution Date**: —

### KI-005

- **Description**: The Economic Indicators domain is named in Part 2.6.3 with a required index (2.6.13) but has no physical table specification anywhere in the source document.
- **Severity**: Medium
- **Status**: Implemented Conservatively — Pending Founder Approval
- **Update (M1, 2026-07-05)**: Implemented as a two-table catalog + time-series pair (`economic_indicators`, `economic_indicator_values`), structurally mirroring `assets`/`historical_prices` rather than folding indicators into the asset catalog — see ADR-008 in `docs/ARCHITECTURE_DECISIONS.md`.
- **Planned Resolution**: Founder review of the design at ADR-008; supersede this status once approved or amended.
- **Resolution Date**: —

### KI-006

- **Description**: Token/session lifecycle (JWT vs. cookie, expiry, refresh, revocation) is entirely unspecified in the Founder Specification despite `JWT_SECRET` being named as a required env var.
- **Severity**: Medium-High
- **Status**: Resolved
- **Resolution**: Founder Decision 002 (`docs/FOUNDER_DECISIONS.md`) — 15-minute stateless JWT access token; 30-day sliding, database-backed, rotating opaque refresh token with reuse detection; both delivered via httpOnly/Secure/SameSite=Strict cookies. Full design in ADR-017/ADR-018 (`docs/ARCHITECTURE_DECISIONS.md`), implemented in `app/auth/` and `app/api/v1/routers/auth.py`.
- **Resolution Date**: 2026-07-11

### KI-007

- **Description**: PRD (Part 3.1.13, 7 core features) and Functional Requirements (Part 3.3.16) disagree on whether Asset Comparison and Report Generation are core MVP features.
- **Severity**: Low
- **Status**: Open — Pending Founder Approval
- **Planned Resolution**: Confirm with founder before investing significant effort in either feature.
- **Resolution Date**: —

### KI-008

- **Description**: `historical_prices` stores both `close_price` and `adjusted_close_price`, but the schema (M1) does not decide which one feeds the growth/return formula. Using `adjusted_close_price` while also manually reinvesting dividends (Founder Specification Part 2.14.10) would double-count dividends.
- **Severity**: Medium
- **Status**: Resolved
- **Resolution**: Founder Decision 001 (`docs/FOUNDER_DECISIONS.md`) — the Simulation Engine uses `close_price` exclusively; dividends and splits are processed explicitly from their own tables; `adjusted_close_price` is retained for validation/comparison/audit only. Full design in `docs/simulation_formulas.md`, engineering rationale in ADR-015 (`docs/ARCHITECTURE_DECISIONS.md`).
- **Resolution Date**: 2026-07-08

### KI-009

- **Description**: `tests/test_migrations.py` applies and then downgrades the migration against whatever `DATABASE_URL` points to. Run locally against the `docker compose` dev database (`itm_dev`), this leaves the dev database schema-less after `pytest` completes. CI is unaffected (it targets a dedicated `itm_test` Postgres service).
- **Severity**: Low
- **Status**: Open
- **Planned Resolution**: Either re-run `alembic upgrade head` after local test runs, or create a dedicated local `itm_test` database and point `DATABASE_URL` at it for test runs — documented in `docs/setup_guide.md`.
- **Resolution Date**: —

### KI-010

- **Description**: `.gitattributes` (added during the Repository Hygiene pass) explicitly sets line-ending rules only for the file types that exist in the repository today (`.py`, `.md`, `.yml`/`.yaml`, `Dockerfile`, `.sh`, `.bat`, `.ps1`). New source file types introduced by future milestones (e.g. `.json`, `.toml`, `.tsx`/`.ts` at the Frontend milestone) will fall back to the `* text=auto eol=lf` catch-all rather than an explicit rule.
- **Severity**: Low
- **Status**: Open
- **Planned Resolution**: Add explicit `.gitattributes` entries for each new source file type as it's introduced, per ADR-010 (`docs/ARCHITECTURE_DECISIONS.md`), rather than relying on the catch-all indefinitely.
- **Resolution Date**: —


### KI-011

- **Description**: The `secret-scan` CI job (`gitleaks/gitleaks-action@v2`) failed intermittently with a non-zero exit after a merge / unrelated-history pull, even though its own log reported "no leaks found." Root cause: the action infers a commit range from the GitHub push/PR event refs to scan only the diff; that range becomes ambiguous once local and remote histories are merged (e.g. after a merge commit or a pull that combines unrelated history), and the action fails to resolve it rather than falling back to a full scan.
- **Severity**: Medium (blocked CI on a false-positive failure — no actual secret was ever found or missed).
- **Status**: Resolved
- **Resolution**: Replaced the wrapper action with a direct `gitleaks detect --source . --redact --verbose` CLI invocation (`.github/workflows/ci.yml`), installed at the pinned version already used in `.pre-commit-config.yaml` (v8.18.4). `gitleaks detect` scans the full git history of the checked-out repository unconditionally rather than diffing two refs, so there is no commit range to resolve and this failure mode cannot recur. Scan strength is unchanged (full history, not weakened to a working-tree-only scan).
- **Resolution Date**: 2026-07-07

### KI-012

- **Description**: `IngestionRepository.get_or_create_asset` / `get_or_create_indicator` (`app/ingestion/storage/repository.py`) are not race-safe: a SELECT-then-INSERT pattern has a TOCTOU window where two concurrent ingestion runs for the same symbol could both attempt to create it.
- **Severity**: Low (no concurrent/background ingestion workers exist in MVP scope — ingestion runs as a single-process CLI invocation today).
- **Status**: Open
- **Planned Resolution**: Replace with an `ON CONFLICT DO NOTHING ... RETURNING` upsert (matching the pattern already used for price/dividend/split/indicator-value rows) before any scheduler or concurrent worker is introduced.
- **Resolution Date**: —

### KI-013

- **Description**: CoinGecko's free-tier `/market_chart/range` endpoint (the only one supporting arbitrary historical date ranges) returns one price observation per day, not true OHLC. `CoinGeckoProvider` sets Open=High=Low=Close to that single observed value and discloses this via a warning on every import (see ADR-012) rather than fabricating intraday variance — but any future feature computing volatility from `high_price - low_price` will silently get zero for all CoinGecko-sourced rows.
- **Severity**: Medium (data-fidelity limitation, not a bug — but consequential for any future feature relying on intraday price range for crypto assets).
- **Status**: Open
- **Planned Resolution**: Revisit if a paid CoinGecko tier or an alternative crypto data provider with genuine historical OHLC becomes available; until then, any Financial Analytics feature (future milestone) using high/low for volatility-style metrics must special-case or exclude CoinGecko-sourced rows.
- **Resolution Date**: —

### KI-014

- **Description**: `CoinGeckoProvider` requires callers to supply CoinGecko's internal coin id (e.g. "bitcoin"), not a ticker symbol (e.g. "BTC") — there is no free-tier symbol-to-id resolution endpoint, so no such mapping is implemented.
- **Severity**: Low (a real constraint of the free API surface, not a code defect; affects operator ergonomics, not correctness).
- **Status**: Open
- **Planned Resolution**: Add a small static ticker-to-CoinGecko-id lookup table (or a one-time cached call to CoinGecko's `/coins/list` endpoint) before crypto ingestion is exposed to non-technical operators or an API endpoint.
- **Resolution Date**: —

### KI-015

- **Description**: The ingestion pipeline has no retry/backoff on transient provider failures (a single timeout or 5xx ends the import immediately with `status="failed"`) and no rate-limit awareness for CoinGecko's free-tier request limits.
- **Severity**: Low (acceptable for manually-triggered, low-frequency imports; would become a real operational problem under a scheduled/high-frequency import workload).
- **Status**: Open
- **Planned Resolution**: Add a bounded retry (e.g. one retry after a timeout) and basic rate-limit-aware throttling when a scheduler/background worker milestone is built — out of scope for a pipeline-mechanism milestone.
- **Resolution Date**: —

### KI-016

- **Description**: The Simulation Engine's design (`docs/simulation_formulas.md` §3, Founder Decision 001) depends on an empirical assumption — that raw `close_price` from yfinance is already retroactively split-adjusted within a single ingestion fetch — that has not been verified against live data (no network access was available when the design note was drafted, nor during M3 implementation).
- **Severity**: High (this is the single largest financial-correctness risk in the M3 design — if false, historical returns spanning a stock split would be silently wrong).
- **Status**: Partially Verified — code behavior confirmed, live-data empirical claim still open
- **What M3 verified**: `tests/simulation/test_split_disclosure.py` confirms the *code* correctly treats `stock_splits` as disclosure-only and never multiplies share counts by `split_ratio`, given synthetic price data constructed to already look split-consistent.
- **What remains unverified — manual verification runbook**: before this design is treated as fully closed for production use, run the following against a live network connection: (1) pick a real, well-documented historical stock split (e.g., AAPL's 4-for-1 split on 2020-08-31, or NVDA's 10-for-1 split on 2024-06-10); (2) run `python -m app.ingestion.cli prices <SYMBOL> --provider yfinance --start <30 days before split> --end <30 days after split>`; (3) inspect the stored `historical_prices.close_price` values on both sides of the split date and confirm they already reflect the retroactive split adjustment (i.e., the pre-split-date prices are already scaled down by the split ratio relative to their original nominal trading price, consistent with today's fetch); (4) if confirmed, this KI can be marked fully Resolved; if not, `docs/simulation_formulas.md` §3 and Founder Decision 001 must be revisited before production use.
- **Planned Resolution**: Execute the runbook above in an environment with network access; treat as a blocking pre-launch gate item.
- **Resolution Date**: —

### KI-017

- **Description**: No trading-day resolution policy exists for simulation `start_date`/`end_date` values that fall on a non-trading day (weekend, market holiday).
- **Severity**: Low
- **Status**: Resolved
- **Resolution**: M3 requires an exact `close_price` row for both `start_date` and `end_date`; absence raises `MissingHistoricalDataError` (spec-compliant per Founder Specification Part 3.3.2) rather than silently substituting a nearby date. Implemented in `app/simulation/repository.py` (`get_price_on_date`, exact-match only) and `app/simulation/engine.py`. A future milestone may choose to add nearest-trading-day resolution as a product/UX improvement — this is a deliberate, spec-compliant default, not an oversight.
- **Resolution Date**: 2026-07-09

### KI-018

- **Description**: `docs/simulation_formulas.md` specifies a scoped `decimal.localcontext()` with `prec=38` and `ROUND_HALF_EVEN` rounding at storage time.
- **Severity**: Medium
- **Status**: Resolved
- **Resolution**: Implemented in `app/simulation/precision.py` (`simulation_decimal_context`, `quantize_currency`, `quantize_percentage`) and used throughout `app/simulation/engine.py`. Verified by `tests/simulation/test_precision.py` (context scoping, rounding behavior at an exact midpoint) and `tests/simulation/test_engine_determinism.py` (same simulation run multiple times produces byte-identical Decimal output across every field, per Founder Specification Part 2.14.12's non-negotiable determinism requirement).
- **Resolution Date**: 2026-07-09

### KI-019

- **Description**: Founder Specification Part 2.6.24's `CHECK(end_date >= start_date)` constraint on the `simulations` table permits a same-day range, while Part 3.3.2's functional requirement states "End date must be after start date" (strictly greater) — a same-day range would also make CAGR's `years` divisor zero, which is mathematically undefined.
- **Severity**: Low
- **Status**: Resolved
- **Resolution**: The Simulation Engine enforces the stricter, spec-correct rule (`end_date` must be strictly after `start_date`) at the application/input-validation layer, raising `InvalidDateRangeError` for a same-day range — the DB-level `CHECK` constraint (unchanged from M1, more permissive) remains a backstop, not the authoritative rule. Verified by `tests/simulation/test_engine_errors.py::test_same_day_range_is_rejected`.
- **Resolution Date**: 2026-07-09

### KI-020

- **Description**: Founder Specification Part 3.5.11 (Dividend Contribution) is an approved MVP financial metric, but the M1 `simulations` schema reserves no column for it, and it is not among the M3 Simulation Engine's required outputs per this milestone's explicit scope.
- **Severity**: Low
- **Status**: Open
- **Planned Resolution**: The per-event `cash_dividend` values computed inside the dividend-reinvestment loop (`app/simulation/formulas.py::apply_dividend_reinvestment`) are sufficient to derive this metric; expose it in a future milestone (Financial Analytics or API layer) without needing to alter the M3 calculation logic itself.
- **Resolution Date**: —

### KI-021

- **Description**: Founder Specification Part 3.3.2 explicitly lists "Growth Chart" as a required output of the Historical Investment Simulation feature, but the M3 Simulation Engine computes and stores only point-in-time start/end values (`initial_price`, `final_price`, `shares_purchased`, `final_value`) — no value-over-time series. Discovered during the M4 API design review, not accounted for in M3's scope.
- **Severity**: Medium
- **Status**: Resolved — partially (see remaining gap below)
- **Resolution (M4, 2026-07-10)**: Extended the Simulation Engine (not the API layer, per the founder-approved decision) with `app/simulation/formulas.py::calculate_growth_series` — a read-only replay of the same dividend-reinvestment event loop at every stored price date in range, rather than only the two endpoints. Wired into `run_simulation` via `SimulationOutcome.growth_series` and surfaced on `POST /api/v1/simulations`'s response. Verified by `tests/simulation/test_growth_series.py` (5 tests, including a cross-check that the series' final point exactly matches the independently-computed `apply_dividend_reinvestment` + `calculate_final_value` result) and one DB-integration test.
- **Remaining gap**: `growth_series` (like `disclosed_splits`) is never persisted — no `simulations` column exists for it — so it is computed fresh only on the `POST` request path. A subsequent `GET /api/v1/simulations/{id}` returns it as an empty list, per the founder's own approved fallback ("if this is too large for M4, expose growth_series as an empty/deferred field and document the deferral"). See ADR-016.
- **Resolution Date**: 2026-07-10

### KI-022

- **Description**: Founder Specification Part 2.8.8 states "sensitive endpoints... Create Simulation... should require authentication," while Part 2.6.24 explicitly designs `simulations.user_id` as nullable "to support a public simulator experience without requiring account creation" — a direct internal inconsistency. Discovered during the M4 API design review.
- **Severity**: Medium
- **Status**: Resolved — per explicit founder decision
- **Resolution (M4, 2026-07-10)**: Founder approved `POST /api/v1/simulations` as public for MVP, optionally authenticated later: anonymous simulations allowed (`user_id = NULL`); rate limiting required instead of authentication as the MVP-appropriate control. Implemented in `app/api/v1/routers/simulations.py` (hardcoded `user_id: uuid.UUID | None = None` until M5 exists) plus a Redis-backed fixed-window rate limiter (`app/core/rate_limit.py`, 60 requests/min on this endpoint).
- **Resolution Date**: 2026-07-10

### KI-023

- **Description**: Founder Specification Part 3.3.10 (Simulation History) and the Administrator-only endpoints implied by Part 2.8.6 (manage assets, trigger imports, review audit logs) both require real authentication/authorization to be meaningfully access-controlled, but M4 explicitly excludes implementing authentication (reserved for M5).
- **Severity**: Low
- **Status**: Resolved — per explicit founder decision, deferred to M5
- **Resolution (M4, 2026-07-10)**: Founder confirmed both endpoint families may be designed (see `docs/api_design.md` §5–6) but must not be implemented until M5 (simulation history) and M5-or-later with admin authorization (import endpoints). Neither route exists in `app/api/v1/routers/` — only `POST`/`GET /api/v1/simulations/{id}` (single-record, not history) and asset read endpoints are implemented in M4. No unprotected admin surface is exposed.
- **Update (M5, 2026-07-11)**: The authentication *middleware* this deferral was waiting on now exists (`app.api.v1.dependencies.get_current_user_required`/`get_current_admin_user`) and is already wired into `GET /api/v1/simulations/{id}`'s ownership check. Simulation History (`GET /api/v1/simulations`) and Admin Import (`GET`/`POST /api/v1/admin/imports`) themselves were not part of M5's explicit scope (Identity system only) and remain unbuilt — tracked forward as new follow-on work, not a reopening of this KI: building them is now a routes-and-schemas exercise, not an auth-infrastructure one.
- **Resolution Date**: 2026-07-10

### KI-024

- **Description**: Founder Specification Part 2.6.24's literal column names are `include_dividends`/`adjust_for_inflation`, but the M1 `simulations` table (and M3 engine parameters) use `dividends_reinvested`/`inflation_adjusted` instead — a naming deviation from the spec's literal text, not caught during M1 or M3. Discovered during the M4 API design review.
- **Severity**: Low
- **Status**: Resolved — per explicit founder decision
- **Resolution (M4, 2026-07-10)**: Founder confirmed the external API contract should use the Founder Specification's own vocabulary while internal names may remain unchanged. Implemented at the Pydantic-schema boundary: `app/api/v1/schemas/simulations.py::SimulationCreateRequest`/`SimulationResponse` use `include_dividends`/`adjust_for_inflation` externally; `app/api/v1/services/simulation_service.py::create_simulation` explicitly maps them to `dividends_reinvested`/`inflation_adjusted` when calling `run_simulation` (no Pydantic aliasing magic — a plain, readable parameter mapping). No schema/engine change made.
- **Resolution Date**: 2026-07-10

### KI-025

- **Description**: Founder Specification Part 3.3.6 lists "Exchange" as an Asset Details output field, but the M1 `assets` table has no such column.
- **Severity**: Low
- **Status**: Open — Founder-approved non-blocking gap
- **Update (M4, 2026-07-10)**: Founder confirmed this is not blocking for M4: `GET /api/v1/assets/{symbol}` returns `"exchange": null` explicitly (present in the contract, not omitted) rather than blocking on a schema change. Implemented in `app/api/v1/schemas/assets.py::AssetDetail`.
- **Planned Resolution**: Add an `exchange` column to the `assets` table in a future schema-enhancement migration; update `AssetDetail`/`asset_service.get_asset_by_symbol` accordingly. Not scheduled to a specific milestone.
- **Resolution Date**: —

### KI-026

- **Description**: `docs/api_design.md` (the M4 design review document, written and approved before implementation) specifies that `POST /api/v1/simulations` "writes an `audit_logs` row (`entity_type="simulation"`, `event_type=SIMULATION_CREATED`... for every request, success or failure." This was not implemented — `app/api/v1/services/simulation_service.py::create_simulation` does not write to `audit_logs` at all. Discovered during M4's own documentation-update pass, after implementation and full test verification were already complete.
- **Severity**: Low (no security or correctness impact — the simulation itself is still stored, including failed attempts, per Founder Specification Part 2.6.24; only the separate `audit_logs` trail described in the design note is missing) — but a genuine design-vs-implementation drift, not a deliberate, founder-approved scope cut like KI-021/023.
- **Status**: Resolved
- **Resolution (M4 follow-up, 2026-07-10)**: Added `app/api/v1/audit.py::record_simulation_audit`, called from `simulation_service.create_simulation` on every outcome — success, the three pre-flight validation errors (`AssetNotFoundError`, `InvalidDateRangeError`, `InvalidInvestmentAmountError`), and the two mid-simulation errors (`MissingHistoricalDataError`, `CalculationError`) — plus `record_simulation_request_validation_audit`, called from the `RequestValidationError` handler (`app/api/v1/exception_handlers.py`) for Pydantic-level request validation failures that never reach the service layer at all (e.g. a non-positive `investment_amount`). Every audit row records: `event_type` (`SIMULATION_CREATED` — see design note below), `entity_id` (the real `Simulation.id` when one was persisted, otherwise a synthetic `uuid4()` correlation id, since `entity_id` is `NOT NULL` and this column is documented as FK-less/polymorphic), and inside `details` (JSONB): `status` (`"succeeded"`/`"failed"`), `asset_symbol`, `request_id`, `error_code` (`None` on success), and `simulation_id` (`None` when no row was persisted). `user_id` is always `NULL` (anonymous), per M4's no-authentication scope. The write is isolated in a SAVEPOINT (`session.begin_nested()`) and swallows `SQLAlchemyError` with a logged warning — a broken audit write can never turn a correct simulation result or a correctly-classified error response into an unrelated 500, mirroring the Redis rate-limiter's fail-open policy.
- **Design note not followed literally**: no new `SIMULATION_FAILED` enum value was added — `AuditEventType`'s own docstring (`app/models/enums.py`) states "adding a value later is a migration... expand deliberately, not speculatively," and a schema migration was judged out of scope for this fix. The existing `SIMULATION_CREATED` value is reused for every attempt (success or failure); `details.status`/`details.error_code` carry the outcome instead. Every literal field the requirement asked for (event type, simulation id, asset symbol, request id, status, error code, timestamp via `created_at`, anonymous `user_id = NULL`) is present.
- **Verified by**: `tests/api/test_simulation_audit.py` (4 tests) — one audit row is written for a successful simulation, an asset-not-found pre-flight failure, a missing-historical-data mid-simulation failure (with `entity_id`/`details.simulation_id` matching the persisted failed `Simulation` row), and a Pydantic-level request validation failure.
- **Resolution Date**: 2026-07-10

### KI-027

- **Description**: `app.auth.service.refresh_session`'s rotation step (read the presented token's row, then create a new row and mark the old one revoked) has no row-level lock (e.g. `SELECT ... FOR UPDATE`). Two concurrent refresh requests presenting the same still-valid refresh token could both read it as valid before either revokes it, each issuing its own new token — forking one session into two instead of enforcing exactly one successor per rotation. Discovered during the M5 red-team self-review.
- **Severity**: Low (mirrors KI-012's TOCTOU race in ingestion asset/indicator resolution — same class of issue, same reasoning: no legitimate client issues two concurrent refreshes with the same token under normal use, and the resulting "fork" does not grant elevated privilege, only an extra valid session).
- **Status**: Open
- **Planned Resolution**: Add `with_for_update=True` (or an equivalent `SELECT ... FOR UPDATE`) to `AuthRepository.get_refresh_token_by_hash` when called from the rotation path, before any milestone introduces genuinely concurrent refresh traffic (e.g. multiple tabs/devices racing a near-simultaneous refresh).
- **Resolution Date**: —

### KI-028

- **Description**: The access token is a stateless JWT by design (Founder Decision 002, ADR-017/018) — it cannot be revoked before its own 15-minute expiry. A stolen access token (e.g. exfiltrated via a compromised proxy or a server-side log that captured a raw `Authorization`/cookie header despite HTTPS) remains valid for up to 15 minutes after logout or password change, even though the corresponding refresh token is immediately revoked. Identified during the M5 red-team self-review as a residual, architecturally-inherent risk, not a bug.
- **Severity**: Low-Medium (bounded by the short, deliberately-chosen 15-minute lifetime; cannot be used to obtain a *new* session once revoked, only to continue an already-stolen one until it naturally expires).
- **Status**: Open — Accepted tradeoff of the approved stateless-access-token design
- **Planned Resolution**: None planned at MVP scale — the 15-minute bound is the accepted mitigation. If this is ever judged insufficient (e.g. a future compliance requirement demands immediate access-token revocation), the fix is a short-TTL server-side denylist checked on every request, which reintroduces a per-request Redis round-trip similar to the existing rate limiter's — a deliberate cost this design avoided for M5.
- **Resolution Date**: —

### KI-029

- **Description**: `AccountLockedError`'s `retry_after_seconds` value (how long until the lockout window clears) is computed by `AccountLockout.is_locked` but never surfaced to the API client — the `429 ACCOUNT_LOCKED` response carries only a generic message, no `Retry-After` header or `retry_after_seconds` field. Identified during the M5 red-team self-review.
- **Severity**: Low (a product/UX gap, not a security issue — if anything, withholding the exact remaining duration very slightly reduces an attacker's ability to precisely time a retry).
- **Status**: Open
- **Planned Resolution**: Surface `retry_after_seconds` via a standard `Retry-After` response header when a future milestone's frontend needs to display a countdown; no backend logic change required, the value is already computed.
- **Resolution Date**: —

### KI-030

- **Description**: `tests/api/test_auth.py` passes `cookies=...` explicitly on individual `TestClient`/httpx requests to work around a real transport quirk: `settings.cookie_secure` defaults to `True` (Secure cookies), but `TestClient` talks to the app over a plain-http scheme (`http://testserver`), so httpx's cookie jar correctly refuses to *resend* a Secure cookie automatically, exactly as a real browser would over non-TLS. The per-request `cookies=` parameter works around this but is flagged by httpx as deprecated (`DeprecationWarning: Setting per-request cookies=... is being deprecated`).
- **Severity**: Low (test-infrastructure-only; does not affect production code or the actual cookie security attributes, which are verified directly by `test_register_sets_httponly_secure_strict_cookies`).
- **Status**: Open
- **Planned Resolution**: If a future httpx major version removes the per-request `cookies=` parameter, switch the affected tests to either an `httpx.Client` configured with `base_url="https://testserver"` (satisfying the Secure-cookie scheme check without the deprecated parameter) or a dedicated non-Secure-cookie test settings override — not yet done, since the current approach works and the warning is non-fatal.
- **Resolution Date**: —

### KI-031

- **Description**: Password reset / account recovery has no implementation — explicitly excluded from M5's scope by direct instruction (Founder Decision 002). A user who forgets their password today has no way to regain access to their account.
- **Severity**: Medium (a real, user-facing product gap — not a security vulnerability, since there is simply no reset flow to exploit — but `.claude/SECURITY_POLICY.md` is explicit that auth should not ship to production without one).
- **Status**: Open — Deliberately deferred, not forgotten
- **Planned Resolution**: Design and implement a standard email-based, time-limited, single-use reset-token flow before any production launch. Must not be built as part of a future milestone's "quick addition" — treat it as its own reviewable unit of work given it touches credential handling directly.
- **Resolution Date**: —
