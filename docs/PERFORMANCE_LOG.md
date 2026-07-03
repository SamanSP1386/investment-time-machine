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
