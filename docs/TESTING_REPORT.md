# TESTING_REPORT.md

Testing quality record, one entry per milestone. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md) and [.claude/TESTING_GUIDELINES.md](../.claude/TESTING_GUIDELINES.md) for coverage targets.

---

## M0 — Repository & Environment Foundation (2026-07-02)

**Unit Tests**: 1 — `test_health_check_returns_success` (`backend/tests/test_health.py`), asserting `GET /health` returns HTTP 200 and the exact `{"success": true, "data": {"status": "healthy"}}` envelope.

**Integration Tests**: 0 — none applicable yet (no database, no external service integration exists in M0's scope).

**Security Tests**: 0 explicit test cases, but gitleaks secret scanning ran in CI and locally as a process-level control (see `SECURITY_LOG.md` M0 entry).

**Performance Tests**: 0 — no performance surface worth measuring yet (see `PERFORMANCE_LOG.md` M0 entry).

**Coverage**: 100% of the only endpoint that exists (`/health`). Not measured against the component-level targets in `.claude/TESTING_GUIDELINES.md` (Simulation Engine 90%+, Ingestion 85%+, API 80%+, DB Logic 80%+, Frontend 60%+) since none of those components exist yet.

**Failed Tests**: 0 failed at final verification. One transient lint failure (ruff import-sort in `alembic/env.py`) was encountered and fixed — not a test failure, logged here for completeness.

**Fixes Applied**: `ruff check --fix .` resolved the import-sort issue in `backend/alembic/env.py`; re-verified clean (`ruff check .` → all checks passed, `black --check .` → unchanged, `pytest -v` → 1 passed).

---

## M1 — Database Schema & Migrations (2026-07-05)

**Unit Tests**: 25 — `backend/tests/test_models.py`, metadata-only (no DB connection required): table/column existence, UUID PKs, TIMESTAMPTZ timestamps, `audit_logs`' intentional absence of `updated_at`, no `FLOAT`/`REAL` financial columns, all unique constraints (`historical_prices`, `dividends`, `stock_splits`, `economic_indicator_values`, `economic_indicators`, `users`), the three approved fixes (`calculation_version` present, `simulations`/`ai_explanations` output columns nullable, `users.password_hash` nullable), FK targets, `NUMERIC(20,8)`/`NUMERIC(10,6)` typing, and `data_source` presence on every imported-data table.

**Integration Tests**: 2 — `backend/tests/test_migrations.py`, DB-dependent (skip gracefully if Postgres unreachable, run for real in CI via a provisioned Postgres service): (1) applies `alembic upgrade head` to a live Postgres and asserts **zero drift** between the resulting schema and `app.models` via `alembic.autogenerate.compare_metadata`; (2) applies then downgrades and asserts no application tables remain.

**Security Tests**: 0 explicit test cases beyond what's covered in `SECURITY_LOG.md`'s M1 entry (structural checks like FK presence/absence and delete-behavior are covered by `test_models.py`, e.g. `test_audit_logs_entity_id_has_no_foreign_key`, `test_audit_logs_user_id_has_no_action_on_delete_set_null`).

**Performance Tests**: 0 — no query patterns exist yet to benchmark (no ingestion or simulation code reads/writes this schema yet).

**Coverage**: All 10 tables and every approved fix have at least one direct assertion. Not measured as a percentage against `.claude/TESTING_GUIDELINES.md`'s "DB Logic 80%+" target since that target is aimed at query/repository code, which doesn't exist yet (M1 is schema-only, no data-access layer).

**Failed Tests**: 0 at final verification. A real bug was caught and fixed *before* it reached a failing test: SQLAlchemy's `Enum(PyEnum)` was found to default to storing the Python enum member **name** (`"STOCK"`) rather than `.value` (`"stock"`) — caught by inspecting the generated DDL directly (a live Postgres was unexpectedly reachable in this session — see `docs/KNOWN_ISSUES.md` KI-001 — which is what surfaced this immediately rather than it silently shipping).

**Fixes Applied**:
- Added a `pg_enum()` helper (`app/models/base.py`) forcing `values_callable` so every native enum stores lowercase `.value` strings, matching what's documented throughout `.claude/DATABASE_RULES.md` and the Founder Specification.
- `ruff --fix` and `black` resolved minor formatting/lint issues (line length, one unused test variable) introduced while writing the new model and test files.
- Full suite (27 tests: 1 from M0 + 25 + 2 new) verified green: `ruff check .`, `black --check .`, and `pytest -v` all passed. The migration was additionally applied for real against the live Postgres instance and left at `head` (all 10 tables present) as the milestone's end-state.
