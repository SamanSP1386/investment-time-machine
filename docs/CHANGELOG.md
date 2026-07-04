# CHANGELOG.md

Semantic version history. Never rewrite history — new entries only. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md).

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
