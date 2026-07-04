"""Tests for `calculate_growth_series` (M4 addition — Founder Specification
Part 3.3.2's "Growth Chart" output, see docs/KNOWN_ISSUES.md KI-021).
"""

from datetime import date
from decimal import Decimal

import pytest

from app.simulation.exceptions import MissingHistoricalDataError
from app.simulation.formulas import (
    DividendEvent,
    PricePoint,
    apply_dividend_reinvestment,
    calculate_final_value,
    calculate_growth_series,
    calculate_shares_purchased,
)


def test_growth_series_with_no_dividends_tracks_pure_price_appreciation() -> None:
    prices = [
        PricePoint(date(2020, 1, 1), Decimal("100")),
        PricePoint(date(2020, 6, 1), Decimal("110")),
        PricePoint(date(2020, 12, 1), Decimal("120")),
    ]
    series = calculate_growth_series(Decimal("10"), prices, [], "TEST")

    assert [p.value for p in series] == [Decimal("1000"), Decimal("1100"), Decimal("1200")]
    assert [p.point_date for p in series] == [date(2020, 1, 1), date(2020, 6, 1), date(2020, 12, 1)]


def test_growth_series_applies_dividend_reinvestment_at_correct_point() -> None:
    # 10 shares @ $100 = $1,000. Dividend of $1/share on 2020-06-01 @ $100 ->
    # +0.1 shares -> 10.1 shares from that point forward.
    prices = [
        PricePoint(date(2020, 1, 1), Decimal("100")),
        PricePoint(date(2020, 6, 1), Decimal("100")),
        PricePoint(date(2020, 12, 1), Decimal("120")),
    ]
    events = [DividendEvent(ex_dividend_date=date(2020, 6, 1), amount_per_share=Decimal("1"))]

    series = calculate_growth_series(Decimal("10"), prices, events, "TEST")

    assert series[0].value == Decimal("1000")  # before dividend: 10 * 100
    assert series[1].value == Decimal("1010")  # at dividend date: 10.1 * 100
    assert series[2].value == Decimal("1212")  # after: 10.1 * 120


def test_growth_series_raises_missing_historical_data_when_dividend_date_has_no_price_row() -> None:
    prices = [
        PricePoint(date(2020, 1, 1), Decimal("100")),
        PricePoint(date(2020, 12, 1), Decimal("120")),
    ]
    # Dividend lands on a date with no matching price row in `prices`.
    events = [DividendEvent(ex_dividend_date=date(2020, 6, 1), amount_per_share=Decimal("1"))]

    with pytest.raises(MissingHistoricalDataError):
        calculate_growth_series(Decimal("10"), prices, events, "TEST")


def test_growth_series_final_point_matches_apply_dividend_reinvestment_result() -> None:
    """Cross-check: the growth series' last value must exactly match what
    `apply_dividend_reinvestment` + `calculate_final_value` produce
    independently — the two code paths must never silently diverge."""
    prices = [
        PricePoint(date(2020, 1, 1), Decimal("100")),
        PricePoint(date(2020, 6, 1), Decimal("100")),
        PricePoint(date(2020, 9, 1), Decimal("101")),
        PricePoint(date(2020, 12, 1), Decimal("120")),
    ]
    events = [
        DividendEvent(ex_dividend_date=date(2020, 6, 1), amount_per_share=Decimal("1")),
        DividendEvent(ex_dividend_date=date(2020, 9, 1), amount_per_share=Decimal("2")),
    ]

    initial_shares = calculate_shares_purchased(Decimal("1000"), Decimal("100"))
    series = calculate_growth_series(initial_shares, prices, events, "TEST")

    final_shares = apply_dividend_reinvestment(
        initial_shares, events, {p.price_date: p.close_price for p in prices}.get, "TEST"
    )
    expected_final_value = calculate_final_value(final_shares, Decimal("120"))

    assert series[-1].value == expected_final_value


def test_growth_series_empty_prices_returns_empty_series() -> None:
    assert calculate_growth_series(Decimal("10"), [], [], "TEST") == []
