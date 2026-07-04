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

---

## M4 — API Layer (2026-07-10)

**Unit Tests**: 9 non-DB tests — `test_formulas.py`/`test_growth_series.py` (5): pure price appreciation, dividend reinvestment applied at the correct point in the series, a missing-data error case, a cross-check against `apply_dividend_reinvestment` + `calculate_final_value` (proving the two independent calculation paths agree on the final value), and an empty-prices edge case; `tests/core/test_rate_limit.py` (4): allows under the limit, blocks over the limit, distinct keys have independent counters (against a real Redis instance, unique key per test), and fails open when Redis is unreachable.

**Integration Tests**: 17 DB-dependent tests (transaction-isolated via `tests/api/conftest.py`, which additionally binds sessions with `join_transaction_mode="create_savepoint"` so the service layer's own `commit()`/`rollback()` calls operate on a nested SAVEPOINT rather than ending the fixture's outer transaction — see ADR-016): `test_assets.py` (7) — search matches symbol/name, empty-query validation, asset detail with `exchange: null`, asset-not-found (404), availability date range, availability with zero price rows, availability for an unknown symbol; `test_simulations.py` (9) — successful creation with a populated `growth_series`, Founder-Specification field-name round-trip (`include_dividends`/`adjust_for_inflation`), unknown-asset 404, invalid-date-range 422, non-positive-amount validation error, missing-price-data 422 with the failed simulation's `id` included, GET-by-id round-trip (confirming `growth_series` is empty on retrieval, per the documented KI-021 gap), simulation-not-found 404, and a rate-limit-exceeded 429 (via a dependency override forcing the limit, exercising the exception-handler wiring directly rather than racing real Redis timing); plus 1 DB-integration engine test (`test_growth_series_populated_end_to_end_through_the_engine`, `tests/simulation/test_engine_known_answer.py`).

**Security Tests**: No dedicated `test_security_*` file; covered implicitly across the integration suite — every named exception type has at least one test confirming its exact HTTP status and error code (`test_create_simulation_unknown_asset_returns_404`, `..._invalid_date_range_returns_422`, `..._missing_price_data_returns_422_with_simulation_id`, `test_rate_limit_exceeded_returns_429`, etc.), and `test_search_assets_requires_nonempty_query` confirms Pydantic-level input validation is enforced before reaching the service layer.

**Performance Tests**: None formally benchmarked — see `PERFORMANCE_LOG.md` M4 entry; the full 26-test API/rate-limit/growth-series suite (DB- and Redis-integration included) completed in well under a second, not representative of production request volume or concurrency.

**Coverage**: All five declared M4 endpoints have at least one success-path and one relevant error-path test. Every named exception type in `app/api/v1/exception_handlers.py` has direct test coverage except `ForbiddenError` (unreachable in M4 — no authenticated caller exists yet to trigger it; correctly untestable until M5) and the generic `Exception` catch-all (deliberately not exercised — there is no way to trigger a genuinely unclassified exception without introducing an artificial one).

**Failed Tests**: 0 at final verification (155 total across the full project: 129 from M0–M3 + 26 new from M4). Three issues surfaced during the session, none a logic bug in the new code: (1) a test assertion initially expected `"1200.00"` for a currency field but the engine correctly quantizes to `NUMERIC(20,8)` scale (`"1200.00000000"`) — the test was wrong, not the code, fixed by correcting the assertion; (2) API-layer DB-integration tests initially produced a real `SAWarning` because the test fixture's outer transaction and the service layer's own `commit()`/`rollback()` calls were the same transaction — fixed via `join_transaction_mode="create_savepoint"` (see ADR-016); (3) a full-suite run left the dev database schema-less (`tests/test_migrations.py`'s known M1/M2/M3 behavior, KI-009), causing a subsequent isolated run to fail with "relation does not exist" — resolved by re-running `alembic upgrade head`, not a code defect.

**Fixes Applied**: The three items above, plus `ruff --fix`/`black` resolving line-length violations and one legitimate `flake8-bugbear` B008 false-positive (FastAPI's `Depends`/`Query`-in-default-argument idiom, resolved via a `pyproject.toml` `extend-immutable-calls` exemption rather than restructuring working, idiomatic FastAPI code).

---

## M4 Follow-Up — Simulation Audit Logging (KI-026) (2026-07-10)

**Unit/Integration Tests**: 4 new tests (`tests/api/test_simulation_audit.py`, all DB-integration, transaction-isolated via the same `tests/api/conftest.py` fixtures as the rest of the M4 API suite): `test_audit_log_written_on_successful_simulation` — one audit row, `status="succeeded"`, `entity_id` matches the created `Simulation.id`, `error_code` is `None`; `test_audit_log_written_on_asset_not_found` — one audit row for a pre-flight failure, `status="failed"`, `error_code="ASSET_NOT_FOUND"`, `details.simulation_id` is `None` (no `Simulation` row exists to reference); `test_audit_log_written_on_missing_historical_data` — one audit row for a mid-simulation failure, confirming `entity_id`/`details.simulation_id` both match the failed `Simulation` row's `id` as returned in the error response; `test_audit_log_written_on_request_validation_failure` — one audit row for a Pydantic-level validation failure (non-positive `investment_amount`), which reaches the audit layer via the `RequestValidationError` handler rather than the service layer.

**Security Tests**: No dedicated file; the four tests above collectively verify the security-relevant property that every outcome category leaves a queryable audit trail, matching the requirement driving this fix (Founder Specification Part 2.8.14, `docs/KNOWN_ISSUES.md` KI-026).

**Performance Tests**: None — one additional `INSERT` per simulation request, not benchmarked.

**Coverage**: All five audit-relevant outcome categories named in the fix request have direct test coverage: success, missing historical data, and "validation failure where possible" (both the pre-flight `AssetNotFoundError`/service-layer category and the Pydantic-level category). `InvalidDateRangeError`/`InvalidInvestmentAmountError` (pre-flight) and `CalculationError` (mid-simulation) share the same two code paths already proven correct by `test_audit_log_written_on_asset_not_found` and `test_audit_log_written_on_missing_historical_data` respectively, and are not each given a separate dedicated audit test (the branching logic, not the specific exception subtype, is what audit-writing depends on).

**Failed Tests**: 0 at final verification (159 total across the full project: 155 from M0–M4 + 4 new from this fix). One test-isolation subtlety required extra handling, not a code defect: `test_audit_log_written_on_request_validation_failure` exercises the one audit code path that legitimately opens and commits its own database session (`record_simulation_request_validation_audit` — no request-scoped session exists at that point in the real request lifecycle), meaning its write is not covered by the rest of the suite's rollback-based isolation; the test explicitly deletes the row it causes, via a second short-lived session, in a `finally` block. Verified with a direct row-count check (`audit_logs`, `assets`, `simulations` all 0) after a full suite run.

**Fixes Applied**: `black` reformatted `app/api/v1/audit.py` and the new test file on first pass (line wrapping only); no logic bugs found by the new tests.
