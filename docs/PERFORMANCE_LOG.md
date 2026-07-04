# PERFORMANCE_LOG.md

System performance over time, one entry per milestone. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md) and [.claude/PERFORMANCE_BUDGET.md](../.claude/PERFORMANCE_BUDGET.md) for target budgets.

---

## M0 — Repository & Environment Foundation (2026-07-02)

**API Response Time**: `/health` responded correctly in local (non-Dockerized) verification; not formally benchmarked — no target applies to this endpoint in `.claude/PERFORMANCE_BUDGET.md` (targets begin at the API Layer milestone, M4).

**Database Query Time**: N/A — no database queries exist yet (Alembic is initialized with `target_metadata = None`, no models).

**Memory Usage**: Not measured — no meaningful footprint to characterize at this scope (a bare FastAPI app with one route).

**Startup Time**: Not formally measured. Qualitatively fast (uvicorn + a single-route FastAPI app with no DB connection pool to establish yet).

**Performance Bottlenecks**: None identified — no surface exists yet that could bottleneck.

**Optimizations**: None applied or needed at this stage.

**Future Improvements**: Establish actual measurement tooling (response-time logging, basic instrumentation) starting at the API Layer milestone (M4), where the first real latency targets (asset search <250ms, simulation creation <500ms, etc.) become relevant per `.claude/PERFORMANCE_BUDGET.md`.

---

## M1 — Database Schema & Migrations (2026-07-05)

**API Response Time**: N/A — no API endpoints touch this schema yet.

**Database Query Time**: Not benchmarked — no query patterns exist yet (no ingestion or repository layer). `alembic upgrade head` against a live Postgres instance completed in well under a second for all 10 tables; not a representative future workload measurement.

**Memory Usage**: Not measured.

**Startup Time**: Not affected — the schema exists only in Postgres and the migration files; nothing loads it into the running FastAPI process at this milestone.

**Performance Bottlenecks**: None identified. One design decision made proactively for future scale: `historical_prices` omits a redundant standalone `asset_id` index, since the composite `(asset_id, price_date)` index already serves asset-only lookups via its leading column — this table is projected to reach ~50M rows at full asset/history coverage (Founder Specification Part 2.6), so avoiding one unnecessary index's write overhead was decided now rather than discovered later as a bottleneck.

**Optimizations**: The `(asset_id, price_date)` composite index above; otherwise no optimization work needed at schema-only scale.

**Future Improvements**: Real query performance can only be measured once the Data Ingestion (M2) and Simulation Engine (M3) milestones actually read/write through this schema at volume — this milestone only establishes the shapes and indexes that future performance work will measure against.

---

## M2 — Historical Data Ingestion Pipeline (2026-07-07)

**API Response Time**: N/A — no API endpoints exist yet.

**Database Query Time**: Not formally benchmarked. Qualitatively fast at test scale (a handful of rows per test, sub-second per DB-integration test — 14 integration tests completed in under 2 seconds total). Not representative of a real multi-year, multi-asset backfill.

**Memory Usage**: Not measured. Known architectural note: each import currently holds its full fetched record list in memory (`list[RawPriceRecord]`) rather than streaming/batching — acceptable for MVP asset-catalog scale (single-symbol, bounded-date-range imports), flagged in `docs/KNOWN_ISSUES.md` KI-015 as a scale consideration, not a current problem.

**Startup Time**: Not affected — the ingestion pipeline is a library + CLI, not a long-running service; no startup cost beyond normal Python import time (yfinance's import graph — pandas, numpy — is the heaviest addition, on the order of the same cost any data-science-adjacent dependency incurs).

**Performance Bottlenecks**: None identified at test scale. Anticipated future bottleneck (not yet encountered): CoinGecko's free-tier rate limits under any automated/scheduled import frequency (KI-015) — a throttling/backoff concern, not a code-level performance issue.

**Optimizations**: Per-record SAVEPOINT (ADR-013) trades a small amount of overhead per insert for correctness (preserving prior rows in a batch on a later failure) — a deliberate correctness-over-raw-throughput choice, consistent with "Accuracy is more important than speed" (Founder Specification, Part 2.13).

**Future Improvements**: Once Data Ingestion runs against real multi-year historical ranges (thousands of rows per asset) rather than test fixtures, revisit: (1) whether the in-memory record list needs batching/streaming, (2) whether `historical_prices`' indexing (established in M1) holds up under real write volume, (3) whether CoinGecko rate limits require an explicit throttle before any scheduled/automated ingestion is introduced.

---

## M3 — Simulation Engine (2026-07-09)

**API Response Time**: N/A — no API endpoints exist yet (M4).

**Database Query Time**: Not formally benchmarked against production-scale data. Per-simulation query cost is bounded and small by design: one exact-match price lookup each for `start_date` and `end_date`, one indexed range query for dividends (`idx_dividends_asset_date`-equivalent), one indexed range query for splits (disclosure only), and up to two as-of CPI lookups — none of which scale with the size of `historical_prices` itself (no full-table or full-range scan is required for the basic growth calculation, since only two exact-date rows are read).

**Memory Usage**: Not measured. Bounded by design: the dividend-reinvestment loop holds only the (typically small, per Founder Specification 2.6.21's own volume estimate of ≤12 events/year) list of dividend events for the requested range in memory — not the full price history between start and end.

**Startup Time**: Not affected — `app.simulation` has no heavyweight import dependencies (no pandas/numpy/yfinance, unlike `app.ingestion`).

**Performance Bottlenecks**: None identified. The Founder Specification's <2s single-simulation target (Part 2.14.15) is almost certainly satisfied by this design's query shape (a handful of indexed point/range lookups, no full scans), but this has not been benchmarked against production-scale `historical_prices` volume (the ~50M-row projection from M1).

**Optimizations**: None needed yet — Founder Specification Part 2.14.15 is explicit that "correctness remains more important than speed," and this milestone's design already avoids the main correctness-vs-performance tension point (no need to scan the full price history for the basic growth calculation; only dividend reinvestment reads a bounded range).

**Future Improvements**: Benchmark `run_simulation` against realistic `historical_prices` volume (thousands of rows/asset, from a real M2 backfill) once available, to confirm the <2s target holds in practice, not just by design reasoning.

---

## M4 — API Layer (2026-07-10)

**API Response Time**: Not formally benchmarked (no load-testing tool run). Qualitatively fast against `TestClient` in the test suite — the full 26-test API/rate-limit/growth-series suite (including 17 DB-integration requests and 4 real-Redis calls) completed in well under a second total. `.claude/PERFORMANCE_BUDGET.md`'s explicit targets (asset search <250ms, simulation creation <500ms) have not been measured against a real deployed instance or realistic concurrency.

**Database Query Time**: `POST /api/v1/simulations` now performs one additional ordered range query over `historical_prices` (`SimulationRepository.get_prices_ordered`, for the growth series) beyond M3's original two exact-match point lookups — still bounded by the requested date range, not the full table, and served by the same `(asset_id, price_date)` composite index established in M1. No new query pattern was introduced for asset search/detail/availability beyond what `asset_service` implements directly (an `ilike` partial match on `symbol`/`name` for search, min/max aggregate for availability) — neither has been benchmarked against `historical_prices`' ~50M-row M1 projection or a realistic multi-thousand-row `assets` catalog.

**Memory Usage**: Not measured. Bounded by design: `calculate_growth_series` holds one `GrowthSeriesPoint` per stored price row in the requested range (typically daily granularity over a bounded holding period, per Founder Specification's own volume assumptions) plus the same small dividend-event list M3 already bounded — not the full historical table.

**Startup Time**: Not measured. `app.main` now imports the full `app.api.v1` router tree, Redis client construction (lazy — the connection is not established at import time, only on first `RateLimiter.allow()` call), and CORS/request-ID middleware — no heavyweight new import-time dependency added (Redis's Python client is lightweight compared to `app.ingestion`'s pandas/numpy/yfinance graph).

**Performance Bottlenecks**: None identified at test scale. Two anticipated future bottlenecks, neither yet encountered: (1) the Redis round-trip added to every rate-limited request (`INCR` + conditional `EXPIRE`) — a single fast in-memory operation, unlikely to matter at MVP traffic but unmeasured under real concurrency; (2) `asset_service.search_assets`'s `ilike` pattern match has no supporting index (`Asset.symbol`/`Asset.name` are not indexed for partial-match search in the M1 schema) — acceptable at the current, small `assets` catalog size, but would degrade at a large catalog.

**Optimizations**: None applied — Founder Specification Part 2.14.15's "correctness more important than speed" principle (already invoked for M3) continues to apply; the rate limiter's fail-open policy on Redis unreachability is itself a deliberate availability-over-strictness tradeoff (Founder Specification's own AI-failure-isolation philosophy applied by analogy), not a raw-performance optimization.

**Future Improvements**: Load-test `POST /api/v1/simulations` and the asset-search endpoint against `.claude/PERFORMANCE_BUDGET.md`'s explicit targets once deployed to a real environment; consider a trigram or partial index on `assets.symbol`/`assets.name` if the catalog grows large enough for `ilike` search to become measurably slow; benchmark the Redis round-trip's real-world latency contribution under concurrent load.
