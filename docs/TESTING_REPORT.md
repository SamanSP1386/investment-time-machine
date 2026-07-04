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

---

## M2 — Historical Data Ingestion Pipeline (2026-07-07)

**Unit Tests**: 47 non-DB tests — `test_providers_yfinance.py` (8), `test_providers_coingecko.py` (7), `test_providers_fred.py` (7) — all via mocking (`unittest.mock.patch` for yfinance, `httpx.MockTransport` for CoinGecko/FRED; zero live network calls); `test_validation.py` (18) — every rejection reason for every record type, plus duplicate-key detection; `test_normalization.py` (6) — type coercion and symbol/currency casing; `test_import_report.py` (6) — status derivation (`success`/`partial`/`failed`), `to_dict()` shape.

**Integration Tests**: 14 DB-dependent tests (`pytest.mark.integration`, transaction-isolated via `conftest.py`'s `db_session` fixture — each test rolls back its own connection-bound transaction, so nothing is ever actually committed to the shared dev database): `test_storage.py` (5) — asset/indicator get-or-create idempotency, price upsert idempotency, and the SAVEPOINT-preserves-prior-rows behavior (ADR-013); `test_audit.py` (3) — succeeded/failed event types, both entity types (asset, economic_indicator); `test_orchestrator.py` (6) — dry-run writes nothing (asset count and audit count unchanged), real-run persists correctly, re-running the same import is idempotent (no duplicate rows), provider failure produces a failed report *and* a failed audit log, dry-run provider failure writes no audit log at all, and the `import_asset` convenience wrapper correctly includes dividends/splits reports for a capable provider.

**Security Tests**: No dedicated `test_security_*` file, but explicit coverage exists for the two ingestion-relevant security properties: `test_upsert_price_constraint_violation_raises_and_preserves_prior_rows` (malformed/adversarial data cannot corrupt prior work) and every provider exception-translation test (a hostile or broken provider response cannot crash the pipeline or propagate an unclassified exception).

**Performance Tests**: None — no representative production-scale import volume exists yet to benchmark against (see `PERFORMANCE_LOG.md` M2 entry).

**Coverage**: All five layers (Provider, Validation, Normalization, Storage, Audit) plus the orchestrator and Import Report have direct test coverage. Every explicitly-required error-handling category (Provider unavailable, Network timeout, Invalid symbol, Validation failure, Duplicate data, Database constraint failure, Unexpected provider response) has at least one dedicated test asserting the correct exception type or report outcome.

**Failed Tests**: 0 at final verification (93/93 across the full suite: 27 from M0/M1 + 63 new from M2, though 3 of those 63 are shared conftest/fixture files not themselves tests — 61 net new test functions). One transient failure occurred mid-session: running the full suite (which includes `test_migrations.py`'s upgrade/downgrade cycle) left the dev database schema-less, causing 13 unrelated ingestion tests to fail with "relation does not exist" on a subsequent isolated run — not a code defect, the same known M1 behavior (KI-009). Resolved by re-running `alembic upgrade head`.

**Fixes Applied**: `black`/`ruff --fix` resolved line-length and import-order issues across the new ingestion modules and tests on first pass; one real bug caught before any test ran against it — `find_duplicate_keys`'s unused `table` variable and an f-string line-length violation, both mechanical. No logic bugs were caught by tests requiring a fix (all 93 tests passed on the first attempt once schema state was correctly restored), which is itself a signal worth treating cautiously — see the Staff Engineer self-review's note on test-writing risk in `docs/MILESTONE_REPORTS/M2_REPORT.md`.

---

## M3 — Simulation Engine (2026-07-09)

**Unit Tests**: 18 non-DB tests — `test_formulas.py` (12): every core formula (shares purchased, final value, total return %, CAGR, inflation adjustment, dividend reinvestment single/multi-event compounding) with known-answer references, several reproducing the Founder Specification's own worked examples verbatim (2.14.7, 2.14.8, 2.14.11) and one independently cross-checked against Python's `math` module rather than re-deriving the formula under test; `test_precision.py` (6): Decimal context scoping (no global leakage), precision floor, and rounding behavior including an exact-midpoint banker's-rounding case, all values verified against Python's `decimal` module directly before being trusted.

**Integration Tests**: 18 DB-dependent tests (`pytest.mark.integration`, transaction-isolated via `tests/simulation/conftest.py` — rolled back per test): `test_engine_known_answer.py` (6) — full engine known-answer scenarios including the Founder Specification's own 2.14.7/2.14.11 examples reproduced end-to-end through the real database, and a dedicated test proving `adjusted_close_price` is never read even when it would produce a wildly different (wrong) result if it were; `test_engine_errors.py` (7) — every named error type (asset not found, invalid date range, invalid investment amount, missing start/end/dividend-date price data), verifying the documented split between pre-flight errors (no persistence) and mid-simulation errors (persisted as failed); `test_engine_determinism.py` (2) — identical inputs against identical stored data produce byte-identical Decimal output across every field, run 3 times in the more complex case; `test_split_disclosure.py` (3) — splits are surfaced for disclosure but never multiply share counts, verified with a scenario that would produce a visibly wrong (4x) result if the engine incorrectly applied `split_ratio`.

**Security Tests**: No dedicated file; covered implicitly by `test_adjusted_close_price_is_never_read_even_when_wildly_different` (data-integrity boundary) and the error-handling suite (no unclassified exception can propagate silently).

**Performance Tests**: None formally benchmarked — see `PERFORMANCE_LOG.md` M3 entry; the full 36-test simulation suite (DB-integration included) completed in well under a second, not representative of production query volume.

**Coverage**: Every Founder Specification-required Simulation Engine responsibility (2.14.3) has direct test coverage: Investment Growth, Total Return, CAGR, Dividend Reinvestment, Inflation Adjustment, Error Handling — matching Part 2.14.18's explicit list of critical test areas exactly.

**Failed Tests**: 0 at final verification (129 total across the full project: 93 from M0–M2 + 36 new from M3). Two transient failures occurred mid-session, both environmental, not code defects: (1) Postgres was initially unreachable because Docker Desktop's engine was not running — resolved by starting Docker Desktop and `docker compose up -d postgres`; (2) the same known M1/M2 behavior (KI-009) — a full-suite run including `test_migrations.py`'s upgrade/downgrade cycle left the dev database schema-less, causing a subsequent run to show spurious failures — resolved by re-running `alembic upgrade head`.

**Fixes Applied**: `black`/`ruff --fix` resolved line-length and import-order issues (including two rounds of consolidating function-local imports to module level for consistency with the rest of the codebase). One design correction was made *during* test-writing, before it became a bug: re-reading Founder Specification 2.14.10/3.3.3 while writing `test_dividends_ignored_entirely_when_not_reinvested` revealed that the original design note's "collect dividends as uninvested cash when not reinvesting" was an invented middle ground not actually described anywhere in the specification — corrected in both the code and `docs/simulation_formulas.md` before any test asserted the wrong behavior.
