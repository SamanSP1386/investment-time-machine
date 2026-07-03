# Entity Relationship Design (Derived)

**Status: derived engineering documentation, not a founder-approved artifact.** Founder Specification Part 2.6.27 — Entity Relationship Design — was never written in the source document (confirmed gap; see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) KI-004). This ERD was produced during the Database Schema milestone (M1) to fill that gap, generated from the actual SQLAlchemy models in `backend/app/models/`, and should be treated as a working reference pending founder review, not as a pre-approved design.

## Diagram

```mermaid
erDiagram
    ASSETS ||--o{ HISTORICAL_PRICES : "has"
    ASSETS ||--o{ DIVIDENDS : "has"
    ASSETS ||--o{ STOCK_SPLITS : "has"
    ASSETS ||--o{ SIMULATIONS : "priced by"
    ECONOMIC_INDICATORS ||--o{ ECONOMIC_INDICATOR_VALUES : "has"
    USERS ||--o{ SIMULATIONS : "owns (nullable)"
    USERS ||--o{ AUDIT_LOGS : "triggers (nullable, SET NULL)"
    SIMULATIONS ||--o{ AI_EXPLANATIONS : "explained by"

    ASSETS {
        uuid id PK
        varchar symbol UK
        varchar name
        enum asset_type
        varchar currency
        boolean is_active
        varchar data_source
    }

    HISTORICAL_PRICES {
        uuid id PK
        uuid asset_id FK
        date price_date
        numeric open_price
        numeric high_price
        numeric low_price
        numeric close_price
        numeric adjusted_close_price
        bigint volume
        varchar data_source
    }

    DIVIDENDS {
        uuid id PK
        uuid asset_id FK
        date ex_dividend_date
        numeric dividend_amount
        varchar currency
        varchar data_source
    }

    STOCK_SPLITS {
        uuid id PK
        uuid asset_id FK
        date split_date
        numeric split_ratio
        varchar data_source
    }

    ECONOMIC_INDICATORS {
        uuid id PK
        varchar indicator_code UK
        varchar name
        varchar unit
        varchar data_source
        boolean is_active
    }

    ECONOMIC_INDICATOR_VALUES {
        uuid id PK
        uuid indicator_id FK
        date observation_date
        numeric value
        varchar data_source
    }

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash "nullable (OAuth)"
        enum auth_method
        varchar display_name
        boolean is_active
        boolean is_admin
    }

    SIMULATIONS {
        uuid id PK
        uuid user_id FK "nullable"
        uuid asset_id FK
        numeric initial_investment_amount
        date start_date
        date end_date
        boolean dividends_reinvested
        boolean inflation_adjusted
        numeric initial_price "nullable output"
        numeric final_price "nullable output"
        numeric shares_purchased "nullable output"
        numeric final_value "nullable output"
        numeric total_return_percentage "nullable output"
        numeric cagr_percentage "nullable output"
        numeric inflation_adjusted_final_value "nullable output"
        enum status
        varchar calculation_version
        text error_message
    }

    AI_EXPLANATIONS {
        uuid id PK
        uuid simulation_id FK
        varchar prompt_version
        varchar model_name
        jsonb input_summary
        text explanation_text "nullable output"
        enum generation_status
        text error_message
    }

    AUDIT_LOGS {
        uuid id PK
        varchar entity_type "no FK (polymorphic)"
        uuid entity_id "no FK (polymorphic)"
        enum event_type
        uuid user_id FK "nullable, ON DELETE SET NULL"
        varchar ip_address
        jsonb details
    }
```

## Relationship notes

- **`assets` is the hub.** `historical_prices`, `dividends`, `stock_splits`, and `simulations` all FK to it. No delete cascade anywhere: assets are deactivated (`is_active = false`), never deleted, so a delete attempt while dependent rows exist is rejected by the database (default `NO ACTION`) rather than silently cascading away historical data.
- **`economic_indicators` / `economic_indicator_values`** is a self-contained catalog + time-series pair, structurally parallel to `assets` / `historical_prices` but intentionally not merged into it — see [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) ADR-008.
- **`simulations.user_id` is nullable** — anonymous simulations are allowed by design (Founder Specification Part 2.6.24).
- **`simulations` → `ai_explanations` is one-to-many**: a simulation can have multiple explanation attempts/versions; `ai_explanations.simulation_id` is NOT NULL — every explanation belongs to exactly one simulation.
- **`audit_logs` has two different kinds of "reference"**: `entity_type`/`entity_id` is a polymorphic pair with **no FK** (a documented, intentional exception — see [DATABASE_RULES.md](../.claude/DATABASE_RULES.md)), while `user_id` is a real FK to `users.id` with `ON DELETE SET NULL`, so the audit trail survives even if the referenced user account is later deleted.
- **No relationship in this schema is FK-cascade-delete.** The only non-default delete behavior anywhere is `audit_logs.user_id`'s `ON DELETE SET NULL`, chosen deliberately so audit history is never destroyed by a user deletion.

## Enums (native Postgres types)

| Enum | Values | Used by |
|---|---|---|
| `asset_type_enum` | stock, etf, crypto, market_index | `assets.asset_type` |
| `simulation_status_enum` | pending, completed, failed | `simulations.status` |
| `ai_generation_status_enum` | pending, completed, failed | `ai_explanations.generation_status` |
| `auth_method_enum` | email_password, google_oauth, github_oauth | `users.auth_method` |
| `audit_event_type_enum` | user_registered, user_login_succeeded, user_login_failed, user_logout, admin_action, data_import_succeeded, data_import_failed, simulation_created, ai_explanation_generated, ai_explanation_failed | `audit_logs.event_type` |

All five are native Postgres `ENUM` types storing the lowercase string value (not the Python enum member name) — see the `pg_enum()` helper in `backend/app/models/base.py`.

## Regenerating this diagram

This file is derived, not hand-maintained truth — if the models change, regenerate the "Diagram" and "Enums" sections from `backend/app/models/` rather than hand-editing them out of sync. The "Relationship notes" section is where actual reasoning lives and should be updated deliberately alongside any schema change.
