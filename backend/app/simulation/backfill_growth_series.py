"""One-time backfill for `Simulation.growth_series` on completed rows
created before the persisted column existed (Founder Decision 014, clause
2). Re-runs `calculate_growth_series` against each row's already-stored
inputs (`asset_id`, `start_date`, `end_date`, `initial_investment_amount`,
`dividends_reinvested`) and stamps the result onto that row's *own*,
already-stored `calculation_version` -- never a newer one, per clause 3: a
backfilled series must carry the exact methodology tag its scalar outputs
were already computed under, so a future engine change never silently
rewrites a historical result a user already viewed.

`calculate_growth_series` itself was NOT changed by Founder Decision 016
(the CAGR percentage-scale fix, KI-045) -- growth_series values are currency
(a value-over-time figure), not a CAGR percentage, so backfilling a "v1" row
with today's `calculate_growth_series` is methodologically identical to what
that row's own creation-time run would have produced. Backfilling never
mixes calculation vintages across a single row's own outputs.

Rows whose underlying price/dividend data can no longer support a full
recompute (a missing start/end price row, or a dividend event landing on a
date with no matching price row -- the same `MissingHistoricalDataError` the
engine itself would raise) are left at `growth_series = NULL` and reported,
never allowed to fail the whole run -- matching this project's established
per-record-isolation precedent (ADR-013).

Usage:
    python -m app.simulation.backfill_growth_series
    python -m app.simulation.backfill_growth_series --dry-run
"""

import argparse
import logging
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import session_scope
from app.models import Simulation
from app.models.enums import SimulationStatus
from app.simulation.exceptions import MissingHistoricalDataError
from app.simulation.formulas import (
    DividendEvent,
    PricePoint,
    calculate_growth_series,
    calculate_shares_purchased,
)
from app.simulation.growth_series_codec import serialize_growth_series
from app.simulation.precision import simulation_decimal_context
from app.simulation.repository import SimulationRepository

logger = logging.getLogger(__name__)


@dataclass
class BackfillResult:
    backfilled: list[uuid.UUID] = field(default_factory=list)
    skipped: list[tuple[uuid.UUID, str]] = field(default_factory=list)


def _recompute_one(repo: SimulationRepository, simulation: Simulation) -> list:
    with simulation_decimal_context():
        initial_price_row = repo.get_price_on_date(simulation.asset_id, simulation.start_date)
        if initial_price_row is None:
            raise MissingHistoricalDataError(str(simulation.asset_id), simulation.start_date)

        events: list[DividendEvent] = []
        if simulation.dividends_reinvested:
            dividend_rows = repo.get_dividends_ordered(
                simulation.asset_id, simulation.start_date, simulation.end_date
            )
            events = [
                DividendEvent(
                    ex_dividend_date=row.ex_dividend_date, amount_per_share=row.dividend_amount
                )
                for row in dividend_rows
            ]

        price_rows = repo.get_prices_ordered(
            simulation.asset_id, simulation.start_date, simulation.end_date
        )
        price_points = [
            PricePoint(price_date=row.price_date, close_price=row.close_price) for row in price_rows
        ]

        initial_shares = calculate_shares_purchased(
            simulation.initial_investment_amount, initial_price_row.close_price
        )
        return calculate_growth_series(
            initial_shares, price_points, events, str(simulation.asset_id)
        )


def backfill(session: Session, *, dry_run: bool = False) -> BackfillResult:
    """Does not commit or roll back -- the caller (or a test's transactional
    fixture) owns the transaction boundary, matching this project's other
    session-taking functions."""
    repo = SimulationRepository(session)
    result = BackfillResult()

    rows = (
        session.execute(
            select(Simulation).where(
                Simulation.status == SimulationStatus.COMPLETED,
                Simulation.growth_series.is_(None),
            )
        )
        .scalars()
        .all()
    )

    for simulation in rows:
        try:
            series = _recompute_one(repo, simulation)
        except MissingHistoricalDataError as exc:
            logger.warning(
                "backfill_growth_series: skipped simulation %s (%s) -- "
                "left growth_series NULL, requires manual review",
                simulation.id,
                exc,
            )
            result.skipped.append((simulation.id, str(exc)))
            continue

        if not dry_run:
            simulation.growth_series = serialize_growth_series(series)
        result.backfilled.append(simulation.id)

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="Report what would be backfilled without writing"
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    with session_scope() as session:
        result = backfill(session, dry_run=args.dry_run)

    logger.info(
        "backfill_growth_series: %s%d simulation(s) backfilled, %d skipped",
        "[dry-run] " if args.dry_run else "",
        len(result.backfilled),
        len(result.skipped),
    )
    for simulation_id, reason in result.skipped:
        logger.info("  skipped %s: %s", simulation_id, reason)


if __name__ == "__main__":
    main()
