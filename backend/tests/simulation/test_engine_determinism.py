"""Determinism tests: Founder Specification Part 2.14.12 — "Given identical
inputs, historical data, and calculation version, the engine must always
produce identical outputs... This requirement is non-negotiable." These
tests run the exact same simulation twice against identical stored data and
assert every output field is byte-identical (Decimal equality, not merely
"close enough").
"""

from datetime import date
from decimal import Decimal

import pytest

from app.simulation.engine import run_simulation
from tests.simulation.conftest import make_asset, make_cpi_observation, make_dividend, make_price

pytestmark = pytest.mark.integration


def test_identical_inputs_produce_identical_outputs_basic_growth(db_session) -> None:
    asset = make_asset(db_session, "DET1")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2021, 1, 1), "137.50")

    kwargs = dict(
        symbol="DET1",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
    )
    first = run_simulation(db_session, **kwargs).simulation
    second = run_simulation(db_session, **kwargs).simulation

    assert first.id != second.id  # two distinct simulation records
    assert first.initial_price == second.initial_price
    assert first.final_price == second.final_price
    assert first.shares_purchased == second.shares_purchased
    assert first.final_value == second.final_value
    assert first.total_return_percentage == second.total_return_percentage
    assert first.cagr_percentage == second.cagr_percentage


def test_identical_inputs_produce_identical_outputs_with_dividends_and_inflation(
    db_session,
) -> None:
    asset = make_asset(db_session, "DET2")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2020, 6, 1), "105")
    make_price(db_session, asset, date(2021, 1, 1), "120")
    make_dividend(db_session, asset, date(2020, 6, 1), "1.5")
    make_cpi_observation(db_session, "CPIAUCSL", date(2020, 1, 1), "80")
    make_cpi_observation(db_session, "CPIAUCSL", date(2021, 1, 1), "84")

    kwargs = dict(
        symbol="DET2",
        investment_amount=Decimal("2500"),
        start_date=date(2020, 1, 1),
        end_date=date(2021, 1, 1),
        dividends_reinvested=True,
        inflation_adjusted=True,
    )
    first = run_simulation(db_session, **kwargs).simulation
    second = run_simulation(db_session, **kwargs).simulation
    third = run_simulation(db_session, **kwargs).simulation

    for field in (
        "initial_price",
        "final_price",
        "shares_purchased",
        "final_value",
        "total_return_percentage",
        "cagr_percentage",
        "inflation_adjusted_final_value",
    ):
        values = {getattr(first, field), getattr(second, field), getattr(third, field)}
        assert len(values) == 1, f"{field} was not deterministic across 3 runs: {values}"
