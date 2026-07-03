"""Initial schema: the nine Founder Specification database domains.

This migration's DDL was generated directly from app/models (via SQLAlchemy's
offline DDL compiler against a mock engine) rather than hand-retyped, to
guarantee it matches the ORM models exactly — there was no live Postgres
instance available to validate an autogenerate diff in the session that
authored it. See docs/KNOWN_ISSUES.md (migration-not-yet-verified-live) and
docs/TESTING_REPORT.md for the follow-up verification plan.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-05

"""

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # --- Native Postgres ENUM types (created before any table references them) ---
    op.execute("CREATE TYPE asset_type_enum AS ENUM ('stock', 'etf', 'crypto', 'market_index')")
    op.execute("CREATE TYPE simulation_status_enum AS ENUM ('pending', 'completed', 'failed')")
    op.execute("CREATE TYPE ai_generation_status_enum AS ENUM ('pending', 'completed', 'failed')")
    op.execute(
        "CREATE TYPE auth_method_enum AS ENUM " "('email_password', 'google_oauth', 'github_oauth')"
    )
    op.execute(
        "CREATE TYPE audit_event_type_enum AS ENUM ("
        "'user_registered', 'user_login_succeeded', 'user_login_failed', 'user_logout', "
        "'admin_action', 'data_import_succeeded', 'data_import_failed', "
        "'simulation_created', 'ai_explanation_generated', 'ai_explanation_failed')"
    )

    # --- assets (Asset Catalog domain) ---
    op.execute(
        """
        CREATE TABLE assets (
            symbol VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL,
            asset_type asset_type_enum NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            data_source VARCHAR(50) NOT NULL,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_assets PRIMARY KEY (id),
            CONSTRAINT uq_assets_symbol UNIQUE (symbol)
        )
        """
    )
    op.execute("CREATE INDEX idx_assets_asset_type ON assets (asset_type)")

    # --- economic_indicators (Economic Indicators domain — catalog half) ---
    op.execute(
        """
        CREATE TABLE economic_indicators (
            indicator_code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            unit VARCHAR(50) NOT NULL,
            data_source VARCHAR(50) NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_economic_indicators PRIMARY KEY (id),
            CONSTRAINT uq_economic_indicators_indicator_code UNIQUE (indicator_code)
        )
        """
    )

    # --- users domain ---
    op.execute(
        """
        CREATE TABLE users (
            email VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255),
            auth_method auth_method_enum DEFAULT 'email_password' NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            is_admin BOOLEAN DEFAULT false NOT NULL,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_users PRIMARY KEY (id),
            CONSTRAINT uq_users_email UNIQUE (email)
        )
        """
    )

    # --- audit_logs domain (immutable: no updated_at; user_id ON DELETE SET NULL) ---
    op.execute(
        """
        CREATE TABLE audit_logs (
            entity_type VARCHAR(100) NOT NULL,
            entity_id UUID NOT NULL,
            event_type audit_event_type_enum NOT NULL,
            user_id UUID,
            ip_address VARCHAR(45),
            details JSONB DEFAULT '{}' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            CONSTRAINT pk_audit_logs PRIMARY KEY (id),
            CONSTRAINT fk_audit_logs_users FOREIGN KEY(user_id)
                REFERENCES users (id) ON DELETE SET NULL
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_audit_logs_entity_type_entity_id "
        "ON audit_logs (entity_type, entity_id)"
    )
    op.execute("CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at)")
    op.execute("CREATE INDEX idx_audit_logs_event_type ON audit_logs (event_type)")
    op.execute("CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id)")

    # --- dividends domain ---
    op.execute(
        """
        CREATE TABLE dividends (
            asset_id UUID NOT NULL,
            ex_dividend_date DATE NOT NULL,
            dividend_amount NUMERIC(20, 8) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
            data_source VARCHAR(50) NOT NULL,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_dividends PRIMARY KEY (id),
            CONSTRAINT uq_dividends_asset_id
                UNIQUE (asset_id, ex_dividend_date, dividend_amount),
            CONSTRAINT fk_dividends_assets FOREIGN KEY(asset_id) REFERENCES assets (id)
        )
        """
    )
    op.execute("CREATE INDEX idx_dividends_asset_id ON dividends (asset_id)")

    # --- economic_indicator_values (Economic Indicators domain — time series half) ---
    op.execute(
        """
        CREATE TABLE economic_indicator_values (
            indicator_id UUID NOT NULL,
            observation_date DATE NOT NULL,
            value NUMERIC(20, 8) NOT NULL,
            data_source VARCHAR(50) NOT NULL,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_economic_indicator_values PRIMARY KEY (id),
            CONSTRAINT uq_economic_indicator_values_indicator_id
                UNIQUE (indicator_id, observation_date, data_source),
            CONSTRAINT fk_economic_indicator_values_economic_indicators
                FOREIGN KEY(indicator_id) REFERENCES economic_indicators (id)
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_economic_indicator_values_indicator_id_observation_date "
        "ON economic_indicator_values (indicator_id, observation_date)"
    )

    # --- historical_prices domain ---
    op.execute(
        """
        CREATE TABLE historical_prices (
            asset_id UUID NOT NULL,
            price_date DATE NOT NULL,
            open_price NUMERIC(20, 8) NOT NULL,
            high_price NUMERIC(20, 8) NOT NULL,
            low_price NUMERIC(20, 8) NOT NULL,
            close_price NUMERIC(20, 8) NOT NULL,
            adjusted_close_price NUMERIC(20, 8) NOT NULL,
            volume BIGINT NOT NULL,
            data_source VARCHAR(50) NOT NULL,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_historical_prices PRIMARY KEY (id),
            CONSTRAINT uq_historical_prices_asset_id
                UNIQUE (asset_id, price_date, data_source),
            CONSTRAINT fk_historical_prices_assets FOREIGN KEY(asset_id) REFERENCES assets (id)
        )
        """
    )
    op.execute("CREATE INDEX idx_historical_prices_price_date ON historical_prices (price_date)")
    op.execute(
        "CREATE INDEX idx_historical_prices_asset_id_price_date "
        "ON historical_prices (asset_id, price_date)"
    )

    # --- simulations domain (calculation_version present from migration 1; outputs
    #     nullable for pending/failed states — approved fixes, see ADR-002/ADR-003) ---
    op.execute(
        """
        CREATE TABLE simulations (
            user_id UUID,
            asset_id UUID NOT NULL,
            initial_investment_amount NUMERIC(20, 8) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            dividends_reinvested BOOLEAN DEFAULT false NOT NULL,
            inflation_adjusted BOOLEAN DEFAULT false NOT NULL,
            initial_price NUMERIC(20, 8),
            final_price NUMERIC(20, 8),
            shares_purchased NUMERIC(20, 8),
            final_value NUMERIC(20, 8),
            total_return_percentage NUMERIC(10, 6),
            cagr_percentage NUMERIC(10, 6),
            inflation_adjusted_final_value NUMERIC(20, 8),
            status simulation_status_enum DEFAULT 'pending' NOT NULL,
            calculation_version VARCHAR(20) DEFAULT 'v1' NOT NULL,
            error_message TEXT,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_simulations PRIMARY KEY (id),
            CONSTRAINT fk_simulations_users FOREIGN KEY(user_id) REFERENCES users (id),
            CONSTRAINT fk_simulations_assets FOREIGN KEY(asset_id) REFERENCES assets (id)
        )
        """
    )

    # --- stock_splits domain ---
    op.execute(
        """
        CREATE TABLE stock_splits (
            asset_id UUID NOT NULL,
            split_date DATE NOT NULL,
            split_ratio NUMERIC(10, 6) NOT NULL,
            data_source VARCHAR(50) NOT NULL,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_stock_splits PRIMARY KEY (id),
            CONSTRAINT uq_stock_splits_asset_id UNIQUE (asset_id, split_date),
            CONSTRAINT fk_stock_splits_assets FOREIGN KEY(asset_id) REFERENCES assets (id)
        )
        """
    )
    op.execute("CREATE INDEX idx_stock_splits_asset_id ON stock_splits (asset_id)")

    # --- ai_explanations domain (explanation_text nullable for pending/failed — ADR-003) ---
    op.execute(
        """
        CREATE TABLE ai_explanations (
            simulation_id UUID NOT NULL,
            prompt_version VARCHAR(20) NOT NULL,
            model_name VARCHAR(100) NOT NULL,
            input_summary JSONB NOT NULL,
            explanation_text TEXT,
            generation_status ai_generation_status_enum DEFAULT 'pending' NOT NULL,
            error_message TEXT,
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_ai_explanations PRIMARY KEY (id),
            CONSTRAINT fk_ai_explanations_simulations
                FOREIGN KEY(simulation_id) REFERENCES simulations (id)
        )
        """
    )


def downgrade() -> None:
    # Reverse dependency order.
    op.execute("DROP TABLE IF EXISTS ai_explanations")
    op.execute("DROP TABLE IF EXISTS stock_splits")
    op.execute("DROP TABLE IF EXISTS simulations")
    op.execute("DROP TABLE IF EXISTS historical_prices")
    op.execute("DROP TABLE IF EXISTS economic_indicator_values")
    op.execute("DROP TABLE IF EXISTS dividends")
    op.execute("DROP TABLE IF EXISTS audit_logs")
    op.execute("DROP TABLE IF EXISTS users")
    op.execute("DROP TABLE IF EXISTS economic_indicators")
    op.execute("DROP TABLE IF EXISTS assets")

    op.execute("DROP TYPE IF EXISTS audit_event_type_enum")
    op.execute("DROP TYPE IF EXISTS auth_method_enum")
    op.execute("DROP TYPE IF EXISTS ai_generation_status_enum")
    op.execute("DROP TYPE IF EXISTS simulation_status_enum")
    op.execute("DROP TYPE IF EXISTS asset_type_enum")
