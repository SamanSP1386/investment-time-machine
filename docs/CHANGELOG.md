# CHANGELOG.md

Semantic version history. Never rewrite history — new entries only. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md).

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
