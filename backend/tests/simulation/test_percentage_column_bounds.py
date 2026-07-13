"""KI-050 regression tests: `total_return_percentage`/`cagr_percentage`
widened from `NUMERIC(10, 6)` (max magnitude `9999.999999`) to
`NUMERIC(14, 6)` (max magnitude `99999999.999999`) —
`backend/alembic/versions/0006_widen_percentage_columns.py`. Run against a
real Postgres instance so a regression back to the narrower column would
fail here exactly as it failed in production (`session.flush()` raising
`psycopg2.errors.NumericValueOutOfRange`), not just in Python-level formula
logic.
"""

import math
from datetime import date
from decimal import Decimal

import pytest

from app.simulation.engine import run_simulation
from tests.simulation.conftest import make_asset, make_price

pytestmark = pytest.mark.integration

# The exact ceiling the old NUMERIC(10, 6) column could hold.
OLD_COLUMN_MAX = Decimal("9999.999999")


def test_total_return_percentage_at_old_boundary_still_succeeds(db_session) -> None:
    """The exact old NUMERIC(10, 6) ceiling (a value the column could always
    hold) must still succeed after widening -- proves the widening is purely
    additive headroom, not a behavior change at the old boundary."""
    asset = make_asset(db_session, "KB1")
    make_price(db_session, asset, date(2020, 1, 1), "1")
    make_price(db_session, asset, date(2021, 1, 1), "100.99999999")

    outcome = run_simulation(
        db_session,
        symbol="KB1",
        investment_amount=Decimal("100"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
    )
    sim = outcome.simulation

    assert sim.status.value == "completed"
    assert sim.total_return_percentage == OLD_COLUMN_MAX


def test_total_return_percentage_just_above_old_boundary_now_succeeds(db_session) -> None:
    """A value that would have overflowed NUMERIC(10, 6) by the smallest
    possible margin (+10,000.01%, one hundredth of a percent past the old
    ceiling) previously raised psycopg2.errors.NumericValueOutOfRange at
    session.flush(), discarding an already-correct calculation (KI-050).
    Must now succeed."""
    asset = make_asset(db_session, "KB2")
    make_price(db_session, asset, date(2020, 1, 1), "1")
    make_price(db_session, asset, date(2021, 1, 1), "101.0001")

    outcome = run_simulation(
        db_session,
        symbol="KB2",
        investment_amount=Decimal("100"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
    )
    sim = outcome.simulation

    assert sim.status.value == "completed"
    assert sim.total_return_percentage == Decimal("10000.010000")
    assert sim.total_return_percentage > OLD_COLUMN_MAX


def test_cagr_percentage_above_old_boundary_now_succeeds(db_session) -> None:
    """KI-050 named cagr_percentage as sharing total_return_percentage's
    identical column bound, though "no live case reaching it was found" at
    discovery time -- an extreme, short-horizon multi-bagger was named as
    the scenario that would. Construct exactly that: a ~150x return in one
    calendar year annualizes to ~15,000% CAGR, comfortably past the old
    ceiling. Expected value hand-derived via `math.pow`, independent of the
    `decimal.Decimal ** Decimal` arithmetic `calculate_cagr` actually uses,
    matching this suite's own known-answer convention."""
    asset = make_asset(db_session, "KB3")
    start = date(2021, 1, 1)
    end = date(2022, 1, 1)
    initial_price = Decimal("100")
    final_price = Decimal("15048.23341035")
    make_price(db_session, asset, start, str(initial_price))
    make_price(db_session, asset, end, str(final_price))

    outcome = run_simulation(
        db_session,
        symbol="KB3",
        investment_amount=Decimal("1000"),
        start_date=start,
        end_date=end,
    )
    sim = outcome.simulation

    years = (end - start).days / 365.25
    actual_ratio = float(final_price / initial_price)
    expected_cagr_percentage = (math.pow(actual_ratio, 1 / years) - 1) * 100

    assert sim.status.value == "completed"
    assert sim.cagr_percentage > OLD_COLUMN_MAX
    assert abs(float(sim.cagr_percentage) - expected_cagr_percentage) < 1e-3


def test_real_aapl_2000_to_2026_repro_magnitude_now_succeeds(db_session) -> None:
    """The exact figure cited in KI-050's own description
    ($1,000 in AAPL, 2000-01-03 -> 2026-07-10, a genuine 26-year real
    compounding return) -- reproduced here with synthetic prices at the
    same order of magnitude, so this regression doesn't depend on real
    ingested market data being present."""
    asset = make_asset(db_session, "KB4")
    make_price(db_session, asset, date(2000, 1, 3), "0.99944198")
    make_price(db_session, asset, date(2026, 7, 10), "315.32000732")

    outcome = run_simulation(
        db_session,
        symbol="KB4",
        investment_amount=Decimal("1000"),
        start_date=date(2000, 1, 3),
        end_date=date(2026, 7, 10),
    )
    sim = outcome.simulation

    assert sim.status.value == "completed"
    assert sim.total_return_percentage == Decimal("31449.606043")
