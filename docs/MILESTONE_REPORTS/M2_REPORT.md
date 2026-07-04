# Milestone 2 Report — Historical Data Ingestion Pipeline

**Date**: 2026-07-07
**Version**: 0.3.0
**Status**: Complete, pending review

This report is self-contained — it does not assume the reader has the rest of the conversation history that produced it, only the repository itself (`.claude/`, `docs/`, `backend/`).

---

## Objective

Build the pipeline responsible for importing historical market data into the platform: **Retrieve → Validate → Normalize → Store → Audit**. Explicitly not responsible for simulation calculations, API endpoints, general business logic, authentication, frontend functionality, or AI. External providers (yfinance, CoinGecko, FRED) are never trusted — every record is validated before it can reach the database, and invalid data is rejected, never silently repaired or fabricated.

## Deliverables

- Five independently testable layers: Provider, Validation, Normalization, Storage, Audit.
- An orchestrator wiring the five layers together, with full dry-run support (no database writes) sharing the same code path as real execution.
- A structured, reusable Import Report for every import (success, partial, failed, or dry run).
- Explicit, named exception types for every required error category — no generic exception handling anywhere in the pipeline.
- A CLI entrypoint for manually triggering imports (not an API endpoint).
- 63 new tests (47 mocked/isolated, 14 DB-integration), all passing, alongside the 30 carried over from M0/M1 (93 total).
- This report, plus updates to all seven Documentation Policy journals.

## Architecture

```
Provider Layer          →  Validation Layer   →  Normalization Layer  →  Storage Layer        →  Audit Layer
(communication only,       (reject invalid,       (provider format →      (idempotent upsert,      (one row per real
 no DB, no validation)      never repair)           platform format)        SAVEPOINT-isolated)      import attempt)
```

- **Provider Layer** (`app/ingestion/providers/`): `YFinanceProvider` (stocks/ETFs: prices, dividends, splits), `CoinGeckoProvider` (crypto: prices), `FredProvider` (economic indicators: observations). Capability protocols (`PriceProvider`, `DividendProvider`, `SplitProvider`, `IndicatorProvider`, all `typing.Protocol` + `@runtime_checkable`) let the orchestrator ask "can this provider do X?" via `isinstance()` rather than assuming a uniform interface every provider must awkwardly satisfy (see ADR-011). A future provider (Polygon, Alpha Vantage, IEX) requires zero changes to existing code — only a new adapter module and a registry entry in `providers/__init__.py`.
- **Validation Layer** (`app/ingestion/validation/rules.py`): `validate_price_record`, `validate_dividend_record`, `validate_split_record`, `validate_indicator_observation` each return a list of rejection reason strings (empty = valid) — nothing raises, nothing repairs. `find_duplicate_keys` catches in-batch duplicates (a provider returning the same date twice in one response).
- **Normalization Layer** (`app/ingestion/normalization/normalizers.py`): converts already-validated raw records into dicts matching the M1 schema exactly — `Decimal` for every `NUMERIC` column, `int` for `BIGINT`, upper-cased symbols/currency codes.
- **Storage Layer** (`app/ingestion/storage/repository.py`): `IngestionRepository` resolves/creates `Asset`/`EconomicIndicator` rows and performs idempotent `INSERT ... ON CONFLICT DO NOTHING ... RETURNING` upserts, each wrapped in its own SAVEPOINT so one genuine constraint violation can't discard earlier work in the same batch (see ADR-013).
- **Audit Layer** (`app/ingestion/audit/recorder.py`): writes exactly one `audit_logs` row per real import attempt, embedding the full Import Report in `details`; dry runs write none (see ADR-014).
- **Orchestrator** (`app/ingestion/orchestrator.py`): `import_asset_prices`, `import_asset_dividends`, `import_asset_splits`, `import_economic_indicator`, and an `import_asset` convenience wrapper.
- **CLI** (`app/ingestion/cli.py`): `python -m app.ingestion.cli prices AAPL --provider yfinance --start ... --end ...` — an operational script, not an API.
- **Core Configuration Layer addition** (`app/core/database.py`): engine/session factory and a `session_scope()` context manager — the only place a SQLAlchemy `Engine` is constructed, needed because this is the first milestone that actually writes to the database.

## Files Changed

**Created**: `backend/app/core/database.py`; `backend/app/ingestion/` (12 modules across `providers/`, `validation/`, `normalization/`, `storage/`, `audit/`, `reports/`, plus `exceptions.py`, `orchestrator.py`, `cli.py`); `backend/tests/ingestion/` (10 test files, 63 tests); `docs/MILESTONE_REPORTS/M2_REPORT.md` (this file).

**Modified**: `backend/app/core/config.py` (`fred_api_key`, `ingestion_http_timeout_seconds`), `.env.example`, `backend/requirements.txt` (+`yfinance`, `httpx`, `requests`), `backend/requirements-dev.txt` (removed redundant `httpx`), `docs/ARCHITECTURE_DECISIONS.md` (+ADR-011–014), `docs/KNOWN_ISSUES.md` (+KI-012–015), `docs/DEVLOG.md`, `docs/CHANGELOG.md`, `docs/SECURITY_LOG.md`, `docs/TESTING_REPORT.md`, `docs/PERFORMANCE_LOG.md`.

## Tests

- **93/93 passing** (30 from M0/M1 unchanged + 63 new).
- 47 non-DB tests: provider adapters (mocked — `unittest.mock.patch` for yfinance, `httpx.MockTransport` for CoinGecko/FRED, zero live network calls), validation rules (every rejection reason for every record type), normalization (type coercion), Import Report (status derivation).
- 14 DB-integration tests (`pytest.mark.integration`, transaction-isolated and rolled back per test — nothing is ever actually committed): storage idempotency and the SAVEPOINT-preserves-prior-rows guarantee, audit event types, and full orchestrator behavior (dry-run writes nothing, real-run persists correctly, re-import is idempotent, provider failure produces both a failed report and a failed audit log, dry-run failure writes no audit log, the convenience wrapper picks up dividends/splits correctly).
- Every explicitly required error-handling category has dedicated coverage: Provider unavailable, Network timeout, Invalid symbol, Validation failure, Duplicate data, Database constraint failure, Unexpected provider response.

## Security Review

- **Provider trust boundaries**: no provider adapter imports `app.models` or `app.core.database` — a structural guarantee the Provider Layer cannot write to the database, not just a convention.
- **Malformed input handling**: every value is coerced via `Decimal(str(value))` and checked; failure is a rejection reason, never a crash, never a silent zero (FRED's `"."` missing-value marker is preserved as `None`).
- **Data integrity**: idempotent upserts + per-record SAVEPOINTs mean a malformed or adversarial record can be rejected, but cannot corrupt or discard previously-stored legitimate data.
- **Audit integrity**: one row per real import attempt, success or failure, with the full structured report embedded; dry runs write none (verified by test, not just documented).
- **Database safety**: no raw/string-interpolated SQL anywhere; `FRED_API_KEY` sourced from environment only, never logged or hardcoded.
- **Disclosed limitation, not hidden one**: CoinGecko's free-tier API cannot provide true historical OHLC; rather than fabricate High/Low, the adapter discloses the approximation via an Import Report warning on every affected import (ADR-012).
- Full findings in `docs/SECURITY_LOG.md`.

## Performance Notes

No representative production-scale import has been run yet (test fixtures only — a handful of rows per test). One proactive design choice: each import currently holds its full fetched record list in memory rather than streaming/batching — acceptable at MVP scale (single-symbol, bounded-range imports), flagged (KI-015) as a revisit point before any high-volume or scheduled ingestion. Full notes in `docs/PERFORMANCE_LOG.md`.

## Technical Debt

Tracked explicitly, not silent:

| ID | Item | Why deferred |
|---|---|---|
| KI-012 | TOCTOU race in `get_or_create_asset`/`get_or_create_indicator` | No concurrent ingestion path exists yet; fix before any scheduler/worker milestone |
| KI-013 | CoinGecko OHLC fidelity limitation (O=H=L=C) | Free-tier API constraint, disclosed not hidden (ADR-012); revisit if a better crypto data source becomes available |
| KI-014 | No ticker→CoinGecko-id mapping | Free API has no such endpoint; add a lookup table before non-technical operator use |
| KI-015 | No retry/backoff or rate-limit awareness | Out of scope for a pipeline-mechanism milestone; a scheduler milestone's concern |

## Lessons Learned

Designing dry-run support *alongside* the real-execution path — rather than as a bolted-on flag checked in a few places — meant the two code paths share nearly all logic, diverging only at the exact point of a database write. That structural choice is what makes "dry run predicts the real outcome" a property tests can actually verify, not just something the docstring claims. Separately: researching a third-party API's real constraints (CoinGecko's lack of historical OHLC) before writing the adapter avoided building something that would have silently fabricated data and required a rewrite once discovered.

## Recruiter Value

High. This milestone demonstrates real data engineering judgment: a provider abstraction that models actual capability differences instead of forcing a leaky uniform interface; an idempotent storage design with a genuine, subtle correctness bug (transaction-wide rollback on one bad record) identified and fixed via SAVEPOINT, backed by a test that specifically proves it; and an engineering tradeoff (CoinGecko OHLC) disclosed transparently rather than smoothed over — the kind of judgment call that comes up in real systems and is worth being able to discuss concretely in an interview.

## Production Readiness

**5/10.** The pipeline mechanism itself is solid, tested, and idempotent — but it has never ingested a real multi-year dataset, has no scheduler or automation, no retry/backoff, and carries one real, documented data-fidelity compromise (CoinGecko OHLC) that a future Financial Analytics milestone must account for. Blocking items before this number moves: a real backfill run against production-scale date ranges, and closing KI-012 before any concurrent ingestion path exists.

## Next Milestone

**M3 — Simulation Engine.** The Simulation Engine reads only already-validated, already-stored rows from this milestone's tables — it never imports anything itself. Before starting M3, the open question flagged in `.claude/DATABASE_RULES.md` (whether `close_price` or `adjusted_close_price` feeds the growth formula, and how manual dividend reinvestment avoids double-counting against an already-adjusted close) must be resolved explicitly, not assumed.
