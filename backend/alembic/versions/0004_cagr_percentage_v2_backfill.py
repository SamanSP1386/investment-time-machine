"""CAGR percentage-scale correction (Founder Decision 016, ADR-040):
`calculate_cagr` previously ("v1") returned a raw fraction instead of a
percentage — a scale mismatch with its sibling `total_return_percentage`
column, discovered as KI-045. This is a one-time, idempotent data backfill
(no schema/DDL change) for every already-stored "v1" `completed` simulation:
`cagr_percentage` is multiplied by exactly 100 (a lossless rescale of an
already-computed value, not a re-derivation) and `calculation_version` is
re-stamped to "v2".

`pending`/`failed` rows (`cagr_percentage IS NULL`) are untouched — there is
nothing to rescale. Rows whose backfilled value would overflow the
NUMERIC(10, 6) column bound (max magnitude 9999.999999 -- i.e. a stored "v1"
value greater than 99.999999) are deliberately excluded from the UPDATE and
logged instead, per Founder Decision 016's explicit "flag any row where x100
would overflow rather than silently failing" -- see ADR-040 for the full
design rationale, including why this is expected to match zero rows against
this platform's real data.

Idempotent: re-running finds zero "v1" rows once the first run completes,
since every matched row is re-stamped to "v2" and `run_simulation` as of this
fix always writes "v2" directly (DEFAULT_CALCULATION_VERSION) for any new
row created after this migration ships.

Revision ID: 0004_cagr_percentage_v2_backfill
Revises: 0003_ai_explanation_type
Create Date: 2026-07-21

"""

import logging

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_cagr_percentage_v2_backfill"
down_revision: str | None = "0003_ai_explanation_type"
branch_labels: str | None = None
depends_on: str | None = None

logger = logging.getLogger("alembic.runtime.migration")

# NUMERIC(10, 6) max magnitude is 9999.999999; a stored "v1" value is itself
# already quantized to 6 decimal places, so the largest pre-scale value that
# cannot overflow when x100 is exactly 99.999999.
OVERFLOW_THRESHOLD = "99.999999"


def upgrade() -> None:
    connection = op.get_bind()

    flagged = connection.exec_driver_sql(
        """
        SELECT id, cagr_percentage FROM simulations
        WHERE calculation_version = 'v1'
          AND cagr_percentage IS NOT NULL
          AND cagr_percentage > %s
        """,
        (OVERFLOW_THRESHOLD,),
    ).fetchall()
    for row in flagged:
        logger.warning(
            "0004_cagr_percentage_v2_backfill: skipped simulation %s "
            "(cagr_percentage=%s would overflow NUMERIC(10,6) at x100) "
            "-- left at calculation_version='v1', requires manual review",
            row[0],
            row[1],
        )

    result = connection.exec_driver_sql(
        """
        UPDATE simulations
        SET cagr_percentage = cagr_percentage * 100,
            calculation_version = 'v2'
        WHERE calculation_version = 'v1'
          AND cagr_percentage IS NOT NULL
          AND cagr_percentage <= %s
        """,
        (OVERFLOW_THRESHOLD,),
    )
    logger.info(
        "0004_cagr_percentage_v2_backfill: rescaled %s row(s) to calculation_version='v2'",
        result.rowcount,
    )


def downgrade() -> None:
    # Not a perfect inverse -- see ADR-040's Tradeoffs for why a downgrade
    # after new "v2" rows exist from normal traffic is not a supported
    # operation, matching every prior migration in this project.
    op.execute(
        """
        UPDATE simulations
        SET cagr_percentage = cagr_percentage / 100,
            calculation_version = 'v1'
        WHERE calculation_version = 'v2'
          AND cagr_percentage IS NOT NULL
        """
    )
