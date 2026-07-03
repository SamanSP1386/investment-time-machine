# DATABASE_RULES.md

Distilled from Founder Specification Part 2.6 (Database Architecture, 2.6.1–2.6.28) and Part 3.9. PostgreSQL is the only approved production database.

## Global physical schema standards (no exceptions)

- **Primary keys**: UUID on every table, no exceptions.
- **Foreign keys**: DB-enforced FK constraints wherever a relationship exists. Application-level-only relationships are prohibited. (Known accepted deviation: `audit_logs.entity_id` is a polymorphic reference with no FK — this is a documented, intentional exception, not a precedent for other tables. Do not repeat this pattern without the same explicit justification.)
- **Timestamps**: every table has `created_at` / `updated_at` as `TIMESTAMPTZ`, UTC only.
- **Naming**: tables `snake_case`, plural (`historical_prices`, not `HistoricalPrice`). Indexes `idx_<table>_<column>`. Foreign keys `fk_<table>_<referenced_table>`.
- **Soft deletes**: not used, except an `is_active` boolean on market/user data where deactivation (not deletion) is the correct semantic.
- **Data provenance**: every table holding imported data has a mandatory `data_source VARCHAR(50)`.
- **Migrations**: Alembic only. Every schema change is generate → review → commit → apply-to-staging → validate → apply-to-production → monitor. No direct production schema edits, ever.

## Financial value types (no exceptions)

- Currency/price values: `NUMERIC(20,8)`.
- Percentages/ratios: `NUMERIC(10,6)`.
- `FLOAT` / `REAL` / `DOUBLE PRECISION` are prohibited for any financial value.

## The nine logical domains

Asset Catalog, Historical Prices, Dividends, Stock Splits, Economic Indicators, Users, Simulations, Audit Logs, AI Explanations.

Known gap: **Economic Indicators has no physical table specification in the source spec** despite being a named domain with a required index. Design it following the same conventions as `historical_prices` (asset/indicator identity + date + `data_source`, unique constraint on the natural key) and flag it for founder review before finalizing — do not treat your design as pre-approved.

## Table-specific rules carried over from the spec

- `assets`: `UNIQUE(symbol)`. Known fragility (spec-acknowledged): global symbol uniqueness will not survive multi-exchange/international listings — treat as an MVP-only assumption, do not build features that assume it's permanent.
- `historical_prices`: `UNIQUE(asset_id, price_date, data_source)`. OHLC + `adjusted_close` all `NUMERIC(20,8)` NOT NULL, `volume BIGINT`. Both `close` and `adjusted_close` are stored — **before writing any calculation that touches dividends, resolve which field is the input** (using `adjusted_close` for growth while also manually reinvesting dividends double-counts them; see [CODING_STANDARDS.md](CODING_STANDARDS.md) simulation engine rules). Raise this as a decision, don't guess silently.
- `dividends` / `stock_splits`: separate tables, each with a source-attributed uniqueness constraint. Split ratio stored as a multiplication factor (4-for-1 = `4.0`, 1-for-10 reverse = `0.1`).
- `users`: MVP fields are minimal (email, `password_hash`, display_name, `is_active`, `is_admin`). **Do not mark `password_hash` NOT NULL** if OAuth (Google/GitHub) is enabled — a spec inconsistency you must resolve at implementation time (nullable + a `auth_method` discriminator is the conservative fix).
- `simulations`: single-asset only. `user_id` is nullable (anonymous simulations allowed). **Output columns (`final_value`, `shares_purchased`, etc.) must be nullable**, not NOT NULL as literally written in the spec — `simulation_status_enum` includes `pending`/`failed` states where no output exists yet. This is a spec bug you should fix at the schema level, not work around in application code.
- `audit_logs`: polymorphic `entity_type` (string) / `entity_id`, `details JSONB`, immutable by convention (no `updated_at`). Redact sensitive values before writing to `details` — this is currently a policy with no enforced mechanism; enforce it in a service-layer helper, not ad hoc at each call site.
- `ai_explanations`: FK to `simulations` is NOT NULL (every explanation belongs to exactly one simulation). Same nullable-output-column issue as `simulations` applies to `explanation_text` when `generation_status` is `pending`/`failed`.

## Reproducibility vs. reimport — resolve before building ingestion

The spec permits overwriting/correcting historical data at any time (reimport), but also mandates that identical historical data must always yield identical simulation results — and explicitly allows deferring the `calculation_version` column that would reconcile these two rules. **Do not defer it.** Add `calculation_version` (or equivalent) to the simulation/results schema from the first migration, even if it's unused for a while — retrofitting it after real simulations exist is far more expensive than including it now.

## Do not

- Do not invent a full Entity Relationship Design as canonical — Part 2.6.27 was never written in the source spec. Produce a working ERD for implementation but flag it as derived/unofficial pending founder review.
- Do not add new tables/domains beyond the nine listed without approval — see [MVP_RULES.md](MVP_RULES.md).
