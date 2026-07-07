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

---

## M5 — Identity Management (2026-07-11)

**API Response Time**: Not formally benchmarked. Qualitatively fast against the test suite (62 new tests, including 15 HTTP-integration and 21 DB-integration, complete in well under a second alongside the rest of the 221-test suite). `.claude/PERFORMANCE_BUDGET.md`'s Auth Request target (<500ms) has not been measured against a real deployed instance.

**Database Query Time**: Every authenticated request now performs one additional indexed point lookup (`session.get(User, user_id)` in `get_current_user_optional`) beyond whatever the route itself already queries — a deliberate choice (re-verify `is_active`/`is_admin` fresh rather than trust the JWT claim) accepted per this project's engineering priority order (Correctness over Performance). Login/register/refresh each perform one `SELECT` (by unique-indexed `email` or `token_hash`) plus one `INSERT`; refresh additionally performs one `UPDATE` (revoking the prior token). None benchmarked against `historical_prices`-scale volume, since `users`/`refresh_tokens` are both expected to stay orders of magnitude smaller than the market-data tables.

**Memory Usage**: Not measured. Bounded by design — no unbounded collection is held anywhere in `app.auth`; Argon2's memory-hard hashing (its whole security property) is the one deliberately memory-costly operation per login/register call, using the library's default cost parameters (not tuned for this project specifically).

**Startup Time**: Not measured. `app.auth`'s import graph adds `argon2-cffi` and `pyjwt`, both lightweight compared to `app.ingestion`'s pandas/numpy/yfinance graph — no heavyweight new dependency introduced.

**Performance Bottlenecks**: None identified at test scale. Two anticipated future considerations, neither yet a measured problem: (1) Argon2's hashing cost (deliberately expensive — that's the security property) is now on the critical path of every login and registration, unlike the rest of the API's largely I/O-bound work; (2) the account-lockout check adds one Redis round-trip to every login attempt, on top of the existing rate-limiter's own round-trip for the same request — two sequential Redis calls per login, not yet measured under concurrent load.

**Optimizations**: None applied — matches this project's established position (Founder Specification Part 2.14.15, already invoked for M3/M4) that correctness and security properties (Argon2's deliberate cost, a fresh per-request authorization check) outrank marginal performance gains at MVP scale.

**Future Improvements**: Benchmark login/register/refresh against `.claude/PERFORMANCE_BUDGET.md`'s <500ms Auth Request target once deployed; if the two-sequential-Redis-call-per-login pattern (rate limit + lockout) ever becomes measurable, consider pipelining them into a single round-trip.

---

## M6 — Educational AI System (2026-07-12)

**API Response Time**: Not formally benchmarked against a real provider (no live Anthropic API key was available in this session). `.claude/PERFORMANCE_BUDGET.md`'s explicit AI explanation target (<15s) is structurally protected regardless of real provider latency: `ai_request_timeout_seconds` (default 12s) bounds the provider call itself, leaving margin inside the 15s budget for serialization/network overhead, and a cache hit or the default `NullProvider` path both return in the same sub-second range as every other endpoint (verified qualitatively — the full 17-test HTTP-integration suite, including every cache/cap/fallback scenario, completes in about a second).

**Database Query Time**: A cache-lookup query (`_find_cached`) and a count query (`_count_attempts`) run before every generation attempt — both served by the new composite index (`idx_ai_explanations_simulation_type` on `(simulation_id, explanation_type)`, migration `0003_ai_explanation_type`) added specifically because this milestone introduced the first query pattern filtering `ai_explanations` by `simulation_id` + `explanation_type` together. `GET .../explanations` (list) is one ordered range read over the same small per-simulation row set — not expected to scale beyond a handful of rows per simulation given the regeneration/follow-up caps.

**Memory Usage**: Not measured. Bounded by design: `input_summary`/`simulation_facts` is a small, fixed-shape dict of scalar fields (never a raw historical price series or unbounded collection) — the smallest request payload of any AI-adjacent design considered during the M6 design review, deliberately, for both cost and integrity-check-simplicity reasons.

**Startup Time**: Not measured. `app.ai`'s import graph adds the `anthropic` SDK (plus its own transitive dependencies — `httpx`-based, already a project dependency via ingestion/auth, `distro`, `jiter`, `docstring-parser`) — lightweight compared to `app.ingestion`'s pandas/numpy/yfinance graph, and the SDK client itself is constructed lazily (only when `AI_PROVIDER != "none"` and a route actually calls `get_ai_provider`), matching the existing Redis-client lazy-construction pattern from M4.

**Performance Bottlenecks**: None identified at test scale. The one bottleneck this milestone cannot yet measure: real Anthropic API latency under the `ai_max_output_tokens` (default 800) budget — the <15s target's actual margin depends on real provider response time, which requires a live API key to benchmark (tracked alongside KI-034's verification need, since both require the same missing prerequisite).

**Optimizations**: Caching (ADR-022) is this milestone's primary performance *and* cost optimization simultaneously — an unchanged `simulation_id`/`prompt_version`/model never re-invokes the provider, which is both the fastest possible response (a single indexed row lookup) and the cheapest. The per-simulation regeneration/follow-up caps bound worst-case provider-call volume per simulation, independent of the generic per-minute rate limiter.

**Future Improvements**: Benchmark real Anthropic API latency once a live key is available, to confirm the 12s internal timeout leaves adequate margin inside the 15s Founder Specification target under realistic network conditions; consider whether `ai_max_output_tokens`' default (800) needs tuning once real generated-explanation length/quality tradeoffs are observed.

---

## M7 Phase 1 — Frontend Foundation (2026-07-15)

**API Response Time**: Not applicable — no page calls the backend API yet; the foundation-verification placeholder (`frontend/src/app/page.tsx`) renders static, hardcoded values.

**Database Query Time**: Not applicable to this phase.

**Memory Usage**: Not measured.

**Startup Time**: `npm run build` (Turbopack, production) completes in ~4-9s locally, including TypeScript checking and static-page generation for both routes (`/`, `/_not-found`); `npm run dev` is ready in ~1.3s. Neither is yet representative of a real page's compile cost.

**Bundle size**: `.next/static/chunks` totals ~720KB uncompressed across all JS chunks for the current two-route app. `recharts` (installed per the required stack, for shared chart types in a future phase) is not imported anywhere in application code yet and therefore contributes zero bytes to this figure — bundling cost will need remeasuring the moment a chart component first imports it, since Recharts is a meaningfully sized dependency. `axios`, `@tanstack/react-query`, `react-hook-form`, and `zod` are all present in the dependency graph via the shared providers/API layer even though no screen exercises them yet (the QueryProvider wraps every page unconditionally).

**Performance Bottlenecks**: None identified — there is no real page to bottleneck yet. The one forward-looking note: `.claude/PERFORMANCE_BUDGET.md`'s <3s frontend page-load target has not been measured against a real network condition or a page with an actual data fetch (React Query) and chart render (Recharts) in the loop — both are the two additions most likely to move this number once Phase 2 builds real screens.

**Optimizations**: `next/font/google` (Inter, JetBrains Mono) self-hosts both fonts at build time rather than fetching from Google Fonts at runtime — eliminates a render-blocking third-party font request by construction, not as a later optimization pass. `React Query`'s `staleTime: 60_000`/`refetchOnWindowFocus: false` defaults (`query-provider.tsx`) avoid refetching Asset/Simulation data more often than this mostly-static, historical-data product actually needs.

**Future Improvements**: Re-measure bundle size and Core Web Vitals once the Simulator → Results flow (the platform's first real page with a data fetch, a form, and a chart) is built in Phase 2 — this phase's placeholder page cannot meaningfully validate the <3s budget.

---

## M7 Phase 1.5 — Frontend Foundation Hardening (2026-07-16)

**API Response Time**: Not applicable — no page calls the backend API yet. The API-contract-drift test does make a real HTTP call to a running backend's `/openapi.json` when one is reachable, but this is a test-time-only cost (skipped entirely when no backend is running), not a product-facing performance concern.

**Database Query Time**: Not applicable.

**Memory Usage**: Not measured.

**Startup Time**: `npm run build` unchanged from M7 Phase 1 (~3-9s). `npm run test`/`test:coverage` grew from ~7s to ~10s total with 61 additional tests — proportionate, no test-suite performance regression identified.

**Bundle size**: No measurable change to the shipped production bundle — every module added this phase (`src/lib/format/`, `src/lib/query/`, `src/lib/next-error-boundary.ts`) is small, dependency-free, pure logic, and `axe-core` (the one new dependency of any real size) is a dev/test-only dependency, never imported by application code that ships to the browser. `/dev/playground` is excluded from the production route entirely (verified: its prerendered static output is the not-found page, not the playground UI), so it adds no shipped weight either.

**Performance Bottlenecks**: None identified. The string-based decimal rounding/grouping in `src/lib/format/decimal-string.ts` is O(n) in the number of digits, negligible for realistic financial figures (tens of digits at most) — not a concern even though it is less optimized than a native numeric operation would be, since correctness (no float precision loss) was the deciding factor, not speed, for a code path that will run at most a few dozen times per page render.

**Optimizations**: None specific to this phase beyond what M7 Phase 1 already established — this phase's additions are correctness/quality infrastructure (formatting, guardrails, conventions, accessibility evidence), not performance-sensitive code paths.

**Future Improvements**: Unchanged from M7 Phase 1 — re-measure bundle size and Core Web Vitals once the Simulator → Results flow is built and there is a real page to measure.
