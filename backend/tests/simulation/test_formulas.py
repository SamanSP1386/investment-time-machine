"""Pure-math known-answer tests for the Simulation Engine formulas — no
database, no fixtures beyond hand-computed reference values. Several cases
reproduce the Founder Specification's own worked examples verbatim (Parts
2.14.7, 2.14.9, 2.14.11), the strongest form of known-answer validation
available: agreement with the specification's own stated output.
"""

import math
from datetime import date
from decimal import Decimal

import pytest

from app.simulation.exceptions import CalculationError, MissingHistoricalDataError
from app.simulation.formulas import (
    DividendEvent,
    apply_dividend_reinvestment,
    calculate_cagr,
    calculate_final_value,
    calculate_inflation_adjusted_value,
    calculate_shares_purchased,
    calculate_total_return_percent,
    calculate_years_between,
)


def test_shares_purchased_matches_founder_spec_2_14_7_example() -> None:
    # Founder Specification 2.14.7: $1,000 / $100 = 10 shares.
    shares = calculate_shares_purchased(Decimal("1000"), Decimal("100"))
    assert shares == Decimal("10")


def test_final_value_matches_founder_spec_2_14_7_example() -> None:
    # Founder Specification 2.14.7: 10 shares x $250 = $2,500.
    final_value = calculate_final_value(Decimal("10"), Decimal("250"))
    assert final_value == Decimal("2500")


def test_total_return_percent_matches_founder_spec_2_14_8_example() -> None:
    # Founder Specification 2.14.8: $1,000 -> $2,500 = 150%.
    result = calculate_total_return_percent(Decimal("2500"), Decimal("1000"))
    assert result == Decimal("150")


def test_cagr_matches_independent_cross_check_via_math_module() -> None:
    # Founder Specification 2.14.9 example: $1,000 -> $2,500 over 10 years.
    # Cross-checked against Python's `math` module (an independent code path
    # from `decimal`) rather than re-deriving the same formula under test.
    # calculate_cagr returns a percentage (Founder Decision 016 / ADR-040,
    # "v2"), so the independently cross-checked fraction is scaled by 100
    # to match.
    cagr = calculate_cagr(Decimal("2500"), Decimal("1000"), Decimal("10"))
    expected_float = (math.pow(2.5, 1 / 10) - 1) * 100
    assert abs(float(cagr) - expected_float) < 1e-6


def test_cagr_total_loss_yields_negative_100_percent() -> None:
    cagr = calculate_cagr(Decimal("0"), Decimal("1000"), Decimal("5"))
    assert cagr == Decimal("-100")


def test_cagr_rejects_non_positive_years_as_calculation_error() -> None:
    with pytest.raises(CalculationError):
        calculate_cagr(Decimal("2500"), Decimal("1000"), Decimal("0"))


def test_years_between_uses_365_25_day_convention() -> None:
    years = calculate_years_between(date(2015, 1, 1), date(2025, 1, 1))
    # 3653 days between 2015-01-01 and 2025-01-01 (includes leap years 2016, 2020, 2024).
    expected = Decimal(3653) / Decimal("365.25")
    assert years == expected


def test_inflation_adjustment_matches_founder_spec_2_14_11_example() -> None:
    # Founder Specification 2.14.11: nominal $10,000 -> real $7,900.
    # Reproduced via cpi_at_start=79, cpi_at_end=100 (ratio 0.79).
    real_value = calculate_inflation_adjusted_value(Decimal("10000"), Decimal("79"), Decimal("100"))
    assert real_value == Decimal("7900")


def test_dividend_reinvestment_single_event_known_answer() -> None:
    # 10 shares at $100 = $1,000 initial. One $1/share dividend while price
    # is still $100: cash = $10, buys 0.1 more shares -> 10.1 shares.
    events = [DividendEvent(ex_dividend_date=date(2020, 6, 1), amount_per_share=Decimal("1"))]

    def price_on_date(_: date) -> Decimal:
        return Decimal("100")

    shares = apply_dividend_reinvestment(Decimal("10"), events, price_on_date, "TEST")
    assert shares == Decimal("10.1")


def test_dividend_reinvestment_compounds_on_updated_share_count() -> None:
    # Starting at 10 shares. Dividend 1: $1/share @ $100 -> +0.1 shares -> 10.1.
    # Dividend 2: $2/share @ $101 on the *new* 10.1 shares -> cash = 20.2,
    # 20.2 / 101 = 0.2 exactly -> 10.3 shares. Verifies compounding uses the
    # share count produced by the prior event, not the original count.
    events = [
        DividendEvent(ex_dividend_date=date(2020, 6, 1), amount_per_share=Decimal("1")),
        DividendEvent(ex_dividend_date=date(2020, 9, 1), amount_per_share=Decimal("2")),
    ]
    prices = {date(2020, 6, 1): Decimal("100"), date(2020, 9, 1): Decimal("101")}

    shares = apply_dividend_reinvestment(Decimal("10"), events, prices.get, "TEST")
    assert shares == Decimal("10.3")


def test_dividend_reinvestment_raises_missing_historical_data_when_price_absent() -> None:
    events = [DividendEvent(ex_dividend_date=date(2020, 6, 1), amount_per_share=Decimal("1"))]

    def price_on_date(_: date) -> Decimal | None:
        return None

    with pytest.raises(MissingHistoricalDataError):
        apply_dividend_reinvestment(Decimal("10"), events, price_on_date, "TEST")


def test_dividend_reinvestment_with_no_events_returns_unchanged_shares() -> None:
    shares = apply_dividend_reinvestment(Decimal("10"), [], lambda _: Decimal("100"), "TEST")
    assert shares == Decimal("10")
