"""Tests for `app.simulation.backfill_growth_series` (Founder Decision 014
clause 2 — backfilling pre-existing completed simulations created before the
`growth_series` column existed).
"""

from datetime import date
from decimal import Decimal

import pytest

from app.simulation.backfill_growth_series import backfill
from app.simulation.engine import run_simulation
from app.simulation.growth_series_codec import deserialize_growth_series
from tests.simulation.conftest import make_asset, make_dividend, make_price

pytestmark = pytest.mark.integration


def _make_pre_migration_row(db_session, *, with_dividend: bool = False):
    """Creates a completed simulation exactly as `run_simulation` would, then
    wipes `growth_series` back to NULL to simulate a row created before the
    persisted column existed."""
    asset = make_asset(db_session, "BKF1")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2020, 6, 1), "100")
    make_price(db_session, asset, date(2021, 1, 1), "137.50")
    if with_dividend:
        make_dividend(db_session, asset, date(2020, 6, 1), "1.00")

    outcome = run_simulation(
        db_session,
        symbol="BKF1",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
        dividends_reinvested=with_dividend,
    )
    original_series = outcome.growth_series
    simulation = outcome.simulation
    simulation.growth_series = None
    db_session.flush()
    return simulation, original_series


def test_backfill_recomputes_growth_series_matching_original(db_session) -> None:
    simulation, original_series = _make_pre_migration_row(db_session)
    original_version = simulation.calculation_version

    result = backfill(db_session)

    assert simulation.id in result.backfilled
    assert result.skipped == []
    recomputed = deserialize_growth_series(simulation.growth_series)
    assert recomputed == original_series
    # Clause 3: never re-stamped to a newer calculation_version.
    assert simulation.calculation_version == original_version


def test_backfill_recomputes_with_dividends(db_session) -> None:
    simulation, original_series = _make_pre_migration_row(db_session, with_dividend=True)

    result = backfill(db_session)

    assert simulation.id in result.backfilled
    recomputed = deserialize_growth_series(simulation.growth_series)
    assert recomputed == original_series


def test_backfill_skips_row_with_missing_start_price(db_session) -> None:
    simulation, _ = _make_pre_migration_row(db_session)
    # Simulate a row whose start-date price can no longer be found (already
    # NULLed growth_series, now also delete the underlying price row).
    from app.models import HistoricalPrice

    db_session.query(HistoricalPrice).filter(
        HistoricalPrice.asset_id == simulation.asset_id,
        HistoricalPrice.price_date == simulation.start_date,
    ).delete()
    db_session.flush()

    result = backfill(db_session)

    assert simulation.id not in result.backfilled
    assert any(sim_id == simulation.id for sim_id, _reason in result.skipped)
    assert simulation.growth_series is None


def test_backfill_dry_run_does_not_write(db_session) -> None:
    simulation, _ = _make_pre_migration_row(db_session)

    result = backfill(db_session, dry_run=True)

    assert simulation.id in result.backfilled
    assert simulation.growth_series is None


def test_backfill_ignores_rows_already_populated(db_session) -> None:
    """A row whose growth_series is already non-NULL (created after the
    column existed) is not touched -- the WHERE clause excludes it, so this
    also proves backfill never re-derives an already-trustworthy series."""
    asset = make_asset(db_session, "BKF2")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2021, 1, 1), "137.50")
    outcome = run_simulation(
        db_session,
        symbol="BKF2",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
    )

    result = backfill(db_session)

    assert outcome.simulation.id not in result.backfilled
    assert outcome.simulation.id not in [sim_id for sim_id, _ in result.skipped]
