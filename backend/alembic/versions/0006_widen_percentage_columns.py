"""Widen `simulations.total_return_percentage`/`cagr_percentage` from
`NUMERIC(10, 6)` to `NUMERIC(14, 6)`, closing `docs/KNOWN_ISSUES.md` KI-050:
`NUMERIC(10, 6)`'s max magnitude (`9999.999999`, i.e. a ~100x return) is a
real, live-reproduced ceiling — `$1,000 in AAPL, 2000-01-03 -> today`
computes a correct `total_return_percentage` of `31449.606043` and fails at
`session.flush()` with `psycopg2.errors.NumericValueOutOfRange`, discarding
an already-correct calculation. `cagr_percentage` shares the identical
column definition and is subject to the same ceiling (ADR-040's overflow
bound check for the "v1"->"v2" backfill already anticipated a value this
large, though no live case reaching it was found at the time).

`NUMERIC(14, 6)` raises the ceiling to `99999999.999999` (~1,000,000x, i.e.
~100,000,000%) -- six orders of magnitude above the worst plausible real
return in this platform's own asset catalog: Bitcoin, the single most
volatile asset ingested (`app.ingestion.seed_real_catalog`), from its
earliest Yahoo-ingestable daily close (~$457 on 2014-09-17) to even an
extremely bullish future price of $1,000,000/BTC is only a ~218,800%
return -- comfortably inside the new bound with wide headroom to spare,
while `NUMERIC(20, 8)`'s own 12-digit integer part (this platform's existing
currency-column precedent) motivates not going further than needed for a
percentage column.

Schema-only, forward-widening `ALTER COLUMN ... TYPE`. No backfill: per
Founder Decision 016/ADR-040's own precedent, a value that overflowed the
old bound was never stored in the first place (the `INSERT`/`UPDATE` that
would have produced it always rolled back) -- there is nothing to rescale,
only a ceiling to raise before it is hit again.

Revision ID: 0006_widen_percentage_columns
Revises: 0005_growth_series_persistence
Create Date: 2026-07-12

"""

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_widen_percentage_columns"
down_revision: str | None = "0005_growth_series_persistence"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE simulations ALTER COLUMN total_return_percentage TYPE NUMERIC(14, 6)")
    op.execute("ALTER TABLE simulations ALTER COLUMN cagr_percentage TYPE NUMERIC(14, 6)")


def downgrade() -> None:
    # Not a perfect inverse if any row created under the wider bound now
    # exceeds NUMERIC(10, 6)'s magnitude -- matching every prior migration in
    # this project, a downgrade after new traffic has landed rows outside
    # the narrower bound is not a supported operation.
    op.execute("ALTER TABLE simulations ALTER COLUMN total_return_percentage TYPE NUMERIC(10, 6)")
    op.execute("ALTER TABLE simulations ALTER COLUMN cagr_percentage TYPE NUMERIC(10, 6)")
