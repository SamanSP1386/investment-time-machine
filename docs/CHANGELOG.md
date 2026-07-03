# CHANGELOG.md

Semantic version history. Never rewrite history — new entries only. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md).

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
