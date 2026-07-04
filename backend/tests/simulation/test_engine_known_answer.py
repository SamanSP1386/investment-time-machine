"""Full Simulation Engine known-answer tests, run against a real (transaction
-isolated, rolled-back) Postgres database. Each test hand-computes its
expected result independently of the code under test.
"""

import math
from datetime import date
from decimal import Decimal

import pytest

from app.simulation.engine import run_simulation
from tests.simulation.conftest import make_asset, make_cpi_observation, make_dividend, make_price

pytestmark = pytest.mark.integration


def test_basic_growth_matches_founder_spec_2_14_7_example(db_session) -> None:
    asset = make_asset(db_session, "KA1")
    make_price(db_session, asset, date(2015, 1, 1), "100")
    make_price(db_session, asset, date(2025, 1, 1), "250")

    outcome = run_simulation(
        db_session,
        symbol="KA1",
        investment_amount=Decimal("1000"),
        start_date=date(2015, 1, 1),
        end_date=date(2025, 1, 1),
    )
    sim = outcome.simulation

    assert sim.status.value == "completed"
    assert sim.shares_purchased == Decimal("10.00000000")
    assert sim.final_value == Decimal("2500.00000000")
    assert sim.total_return_percentage == Decimal("150.000000")
    expected_cagr = math.pow(2.5, 1 / (3653 / 365.25)) - 1
    assert abs(float(sim.cagr_percentage) - expected_cagr) < 1e-6
    assert outcome.disclosed_splits == ()


def test_adjusted_close_price_is_never_read_even_when_wildly_different(db_session) -> None:
    """Founder Decision 001: adjusted_close_price must never feed the
    calculation. Prove it by storing an adjusted_close_price that would
    produce a completely different result if it were mistakenly used."""
    asset = make_asset(db_session, "KA2")
    make_price(db_session, asset, date(2020, 1, 1), "100", adjusted_close="25")
    make_price(db_session, asset, date(2021, 1, 1), "200", adjusted_close="9999")

    outcome = run_simulation(
        db_session,
        symbol="KA2",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
    )
    sim = outcome.simulation

    # If adjusted_close_price had been used: shares = 1000/25 = 40, final = 40*9999 = huge.
    # Using close_price only: shares = 1000/100 = 10, final = 10*200 = 2000.
    assert sim.shares_purchased == Decimal("10.00000000")
    assert sim.final_value == Decimal("2000.00000000")


def test_dividend_reinvestment_two_events_known_answer(db_session) -> None:
    asset = make_asset(db_session, "KA3")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2020, 6, 1), "100")
    make_price(db_session, asset, date(2020, 9, 1), "101")
    make_price(db_session, asset, date(2020, 12, 1), "120")
    make_dividend(db_session, asset, date(2020, 6, 1), "1")
    make_dividend(db_session, asset, date(2020, 9, 1), "2")

    outcome = run_simulation(
        db_session,
        symbol="KA3",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2020, 12, 1),
        dividends_reinvested=True,
    )
    sim = outcome.simulation

    # Hand-traced: 10 shares -> +0.1 (div1) -> 10.1 -> +0.2 (div2) -> 10.3 shares.
    assert sim.shares_purchased == Decimal("10.30000000")
    assert sim.final_value == Decimal("1236.00000000")


def test_dividends_ignored_entirely_when_not_reinvested(db_session) -> None:
    """Founder Specification 2.14.10/3.3.3: disabled means dividend events
    are ignored entirely, not collected as uninvested cash. Prove it by
    seeding a dividend that would change the result if it were counted at
    all, and confirming the outcome matches pure price appreciation."""
    asset = make_asset(db_session, "KA4")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2020, 12, 1), "120")
    make_dividend(db_session, asset, date(2020, 6, 1), "5")  # large dividend, must be ignored

    outcome = run_simulation(
        db_session,
        symbol="KA4",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2020, 12, 1),
        dividends_reinvested=False,
    )
    sim = outcome.simulation

    assert sim.shares_purchased == Decimal("10.00000000")
    assert sim.final_value == Decimal("1200.00000000")  # pure price appreciation only


def test_inflation_adjustment_matches_founder_spec_2_14_11_example(db_session) -> None:
    asset = make_asset(db_session, "KA5")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2021, 1, 1), "100")
    make_cpi_observation(db_session, "CPIAUCSL", date(2020, 1, 1), "79")
    make_cpi_observation(db_session, "CPIAUCSL", date(2021, 1, 1), "100")

    outcome = run_simulation(
        db_session,
        symbol="KA5",
        investment_amount=Decimal("10000"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
        inflation_adjusted=True,
    )
    sim = outcome.simulation

    assert sim.final_value == Decimal("10000.00000000")  # flat nominal price
    assert sim.inflation_adjusted_final_value == Decimal("7900.00000000")


def test_inflation_adjustment_left_null_when_cpi_data_missing(db_session) -> None:
    """Founder Specification 3.3.4: "Missing CPI Data -> Inflation
    adjustment unavailable" — a soft degradation, not a failed simulation."""
    asset = make_asset(db_session, "KA6")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2021, 1, 1), "110")

    outcome = run_simulation(
        db_session,
        symbol="KA6",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
        inflation_adjusted=True,
    )
    sim = outcome.simulation

    assert sim.status.value == "completed"
    assert sim.inflation_adjusted_final_value is None
    assert sim.final_value == Decimal("1100.00000000")


def test_growth_series_populated_end_to_end_through_the_engine(db_session) -> None:
    asset = make_asset(db_session, "KA7")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2020, 6, 1), "100")
    make_price(db_session, asset, date(2020, 12, 1), "120")
    make_dividend(db_session, asset, date(2020, 6, 1), "1")

    outcome = run_simulation(
        db_session,
        symbol="KA7",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2020, 12, 1),
        dividends_reinvested=True,
    )

    series = outcome.growth_series
    assert [p.point_date for p in series] == [date(2020, 1, 1), date(2020, 6, 1), date(2020, 12, 1)]
    assert series[0].value == Decimal("1000")  # 10 shares * 100
    assert series[1].value == Decimal("1010")  # 10.1 shares * 100, dividend applied
    assert series[-1].value == outcome.simulation.final_value  # matches stored final_value
