"""Simulation Engine error-handling tests. Verifies the split behavior
described in `app/simulation/engine.py`'s module docstring: pre-flight
validation errors (asset/date/amount) never persist a `Simulation` row;
mid-simulation errors (missing historical data) do, with status=failed.
"""

from datetime import date
from decimal import Decimal

import pytest
import sqlalchemy as sa

from app.models import Simulation
from app.simulation.engine import run_simulation
from app.simulation.exceptions import (
    AssetNotFoundError,
    InvalidDateRangeError,
    InvalidInvestmentAmountError,
    MissingHistoricalDataError,
)
from tests.simulation.conftest import make_asset, make_dividend, make_price

pytestmark = pytest.mark.integration


def test_asset_not_found_raises_and_persists_nothing(db_session) -> None:
    sim_count_before = db_session.execute(
        sa.select(sa.func.count()).select_from(Simulation)
    ).scalar_one()

    with pytest.raises(AssetNotFoundError):
        run_simulation(
            db_session,
            symbol="DOES-NOT-EXIST",
            investment_amount=Decimal("1000"),
            start_date=date(2020, 1, 1),
            end_date=date(2021, 1, 1),
        )

    sim_count_after = db_session.execute(
        sa.select(sa.func.count()).select_from(Simulation)
    ).scalar_one()
    assert sim_count_after == sim_count_before


def test_invalid_date_range_raises_and_persists_nothing(db_session) -> None:
    asset = make_asset(db_session, "ERR1")
    sim_count_before = db_session.execute(
        sa.select(sa.func.count()).select_from(Simulation)
    ).scalar_one()

    with pytest.raises(InvalidDateRangeError):
        run_simulation(
            db_session,
            symbol="ERR1",
            investment_amount=Decimal("1000"),
            start_date=date(2021, 1, 1),
            end_date=date(2020, 1, 1),  # before start
        )

    sim_count_after = db_session.execute(
        sa.select(sa.func.count()).select_from(Simulation)
    ).scalar_one()
    assert sim_count_after == sim_count_before
    assert (
        asset is not None
    )  # keep reference; asset creation itself must not be rolled back by the error


def test_same_day_range_is_rejected() -> None:
    # end_date must be strictly after start_date (Founder Specification
    # 3.3.2) even though the raw DB CHECK constraint (2.6.24) only requires
    # end_date >= start_date — the engine enforces the stricter, spec-correct
    # rule since a same-day range makes CAGR's years divisor zero.
    with pytest.raises(InvalidDateRangeError):
        run_simulation(
            object(),  # never reached: validation happens before any DB access
            symbol="X",
            investment_amount=Decimal("1000"),
            start_date=date(2020, 1, 1),
            end_date=date(2020, 1, 1),
        )


def test_non_positive_investment_amount_is_rejected() -> None:
    with pytest.raises(InvalidInvestmentAmountError):
        run_simulation(
            object(),
            symbol="X",
            investment_amount=Decimal("0"),
            start_date=date(2020, 1, 1),
            end_date=date(2021, 1, 1),
        )


def test_missing_start_date_price_persists_failed_simulation(db_session) -> None:
    asset = make_asset(db_session, "ERR2")
    make_price(db_session, asset, date(2021, 1, 1), "110")  # end date only, no start date row

    with pytest.raises(MissingHistoricalDataError):
        run_simulation(
            db_session,
            symbol="ERR2",
            investment_amount=Decimal("1000"),
            start_date=date(2020, 1, 1),
            end_date=date(2021, 1, 1),
        )

    failed = db_session.execute(
        sa.select(Simulation).where(Simulation.asset_id == asset.id)
    ).scalar_one()
    assert failed.status.value == "failed"
    assert failed.error_message is not None
    assert "2020-01-01" in failed.error_message
    assert failed.final_value is None
    assert failed.shares_purchased is None


def test_missing_end_date_price_persists_failed_simulation(db_session) -> None:
    asset = make_asset(db_session, "ERR3")
    make_price(db_session, asset, date(2020, 1, 1), "100")  # start date only, no end date row

    with pytest.raises(MissingHistoricalDataError):
        run_simulation(
            db_session,
            symbol="ERR3",
            investment_amount=Decimal("1000"),
            start_date=date(2020, 1, 1),
            end_date=date(2021, 1, 1),
        )

    failed = db_session.execute(
        sa.select(Simulation).where(Simulation.asset_id == asset.id)
    ).scalar_one()
    assert failed.status.value == "failed"
    assert "2021-01-01" in failed.error_message


def test_missing_dividend_date_price_persists_failed_simulation(db_session) -> None:
    """A dividend's ex-date has no matching close_price row (e.g. a data
    gap) -- must fail loudly, never silently skip or substitute a price."""
    asset = make_asset(db_session, "ERR4")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2021, 1, 1), "110")
    make_dividend(db_session, asset, date(2020, 6, 1), "1")  # no price row on this date

    with pytest.raises(MissingHistoricalDataError):
        run_simulation(
            db_session,
            symbol="ERR4",
            investment_amount=Decimal("1000"),
            start_date=date(2020, 1, 1),
            end_date=date(2021, 1, 1),
            dividends_reinvested=True,
        )

    failed = db_session.execute(
        sa.select(Simulation).where(Simulation.asset_id == asset.id)
    ).scalar_one()
    assert failed.status.value == "failed"
    assert "2020-06-01" in failed.error_message
