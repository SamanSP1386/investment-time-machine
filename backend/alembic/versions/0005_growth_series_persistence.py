"""Growth series persistence (Founder Decision 014, Option A): adds a
nullable `simulations.growth_series` JSONB column so the Simulation Engine's
value-over-time series is persisted at creation time instead of being
recomputed -- and returned empty -- on every subsequent `GET`. Closes the
remaining gap tracked at docs/KNOWN_ISSUES.md KI-021.

Schema-only. The backfill of pre-existing completed rows is a separate,
one-time Python script (`python -m app.simulation.backfill_growth_series`),
not part of this migration -- unlike KI-045's CAGR backfill (a pure
arithmetic rescale expressible in one SQL UPDATE), recomputing a growth
series requires replaying `app.simulation.formulas.calculate_growth_series`
against each row's stored price/dividend history, which is Python
calculation logic, not something a migration's raw SQL can do.

Revision ID: 0005_growth_series_persistence
Revises: 0004_cagr_percentage_v2_backfill
Create Date: 2026-07-23

"""

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_growth_series_persistence"
down_revision: str | None = "0004_cagr_percentage_v2_backfill"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE simulations ADD COLUMN growth_series JSONB")


def downgrade() -> None:
    op.execute("ALTER TABLE simulations DROP COLUMN IF EXISTS growth_series")
