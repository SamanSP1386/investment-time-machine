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

## The nine logical domains — implemented in M1 (`backend/app/models/`)

Asset Catalog (`assets`), Historical Prices (`historical_prices`), Dividends (`dividends`), Stock Splits (`stock_splits`), Economic Indicators (`economic_indicators` + `economic_indicator_values`), Users (`users`), Simulations (`simulations`), Audit Logs (`audit_logs`), AI Explanations (`ai_explanations`). Ten physical tables for nine logical domains — Economic Indicators is a catalog + time-series pair, mirroring `assets`/`historical_prices` (see [docs/ARCHITECTURE_DECISIONS.md](../docs/ARCHITECTURE_DECISIONS.md) ADR-008). Full ERD: [docs/erd.md](../docs/erd.md) (derived, pending founder review per KI-004/KI-005).

## Table-specific rules (as implemented)

- `assets`: `UNIQUE(symbol)`. Known fragility (spec-acknowledged): global symbol uniqueness will not survive multi-exchange/international listings — treat as an MVP-only assumption, do not build features that assume it's permanent.
- `historical_prices`: `UNIQUE(asset_id, price_date, data_source)`. OHLC + `adjusted_close` all `NUMERIC(20,8)` NOT NULL, `volume BIGINT`. Both `close` and `adjusted_close` are stored. **Resolved (Founder Decision 001, `docs/FOUNDER_DECISIONS.md`): the Simulation Engine uses `close_price` exclusively, with dividends and splits processed explicitly from their own tables.** `adjusted_close_price` is retained for validation/comparison/audit only and must never be read by simulation calculations — see `docs/simulation_formulas.md` for the full design and ADR-015 (`docs/ARCHITECTURE_DECISIONS.md`) for the engineering rationale.
- `dividends` / `stock_splits`: separate tables, each with a source-attributed uniqueness constraint. Split ratio stored as a multiplication factor (4-for-1 = `4.0`, 1-for-10 reverse = `0.1`).
- `economic_indicators` / `economic_indicator_values`: catalog (`indicator_code`, `name`, `unit`) + time series (`observation_date`, `value`, `data_source`, unique on indicator+date+source), deliberately separate from `assets`/`historical_prices` since indicators aren't investable instruments.
- `users`: MVP fields are minimal (email, `password_hash`, `auth_method`, display_name, `is_active`, `is_admin`). `password_hash` is nullable with `auth_method` as the discriminator (`email_password`/`google_oauth`/`github_oauth`) — OAuth login itself isn't implemented until the Authentication milestone, but the schema doesn't need a later migration to relax a NOT NULL constraint.
- `simulations`: single-asset only. `user_id` is nullable (anonymous simulations allowed). Output columns (`final_value`, `shares_purchased`, etc.) are nullable — `simulation_status_enum` includes `pending`/`failed` states where no output exists yet. `calculation_version` (`VARCHAR(20)`, default `'v1'`) is present from migration 1, not deferred.
- `audit_logs`: polymorphic `entity_type` (string) / `entity_id` with **no FK** — a documented, intentional exception, not a precedent for other tables. `user_id` **is** a real FK to `users.id` with `ON DELETE SET NULL`, so the audit trail survives a user deletion. `details JSONB`, immutable by convention (no `updated_at`). Redact sensitive values before writing to `details` — this is currently a policy with no enforced mechanism; enforce it in a service-layer helper, not ad hoc at each call site.
- `ai_explanations`: FK to `simulations` is NOT NULL (every explanation belongs to exactly one simulation). `explanation_text` is nullable for the same reason as `simulations`' output columns — `ai_generation_status_enum` includes `pending`/`failed`.

## Reproducibility vs. reimport — resolved

`calculation_version` (`VARCHAR(20)`, default `'v1'`, NOT NULL) exists on `simulations` from the very first migration — see ADR-002 in [docs/ARCHITECTURE_DECISIONS.md](../docs/ARCHITECTURE_DECISIONS.md). The Simulation Engine milestone is responsible for actually *using* this field to gate reproducibility (bumping it when formulas change) — the schema only reserves the column, it doesn't enforce versioning behavior on its own.

## Do not

- Do not treat `docs/erd.md` as founder-approved — it's derived documentation filling a confirmed spec gap (Part 2.6.27 was never written), not a pre-approved design.
- Do not add new tables/domains beyond the nine listed without approval — see [MVP_RULES.md](MVP_RULES.md).
- Do not repeat the `audit_logs.entity_id` FK-less pattern elsewhere without the same explicit justification.
