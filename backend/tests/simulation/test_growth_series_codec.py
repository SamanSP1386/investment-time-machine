"""Tests for `app.simulation.growth_series_codec` (Founder Decision 014's
storage encoding for `Simulation.growth_series`).
"""

from datetime import date
from decimal import Decimal

from app.simulation.formulas import GrowthSeriesPoint
from app.simulation.growth_series_codec import (
    deserialize_growth_series,
    serialize_growth_series,
)


def test_serialize_growth_series_uses_string_values_never_json_numbers() -> None:
    series = [GrowthSeriesPoint(point_date=date(2020, 1, 2), value=Decimal("1234.56789012"))]

    encoded = serialize_growth_series(series)

    assert encoded == [{"point_date": "2020-01-02", "value": "1234.56789012"}]
    assert isinstance(encoded[0]["value"], str)


def test_round_trip_preserves_exact_decimal_value() -> None:
    series = [
        GrowthSeriesPoint(point_date=date(2020, 1, 2), value=Decimal("1000")),
        GrowthSeriesPoint(point_date=date(2020, 6, 15), value=Decimal("1010.5")),
    ]

    encoded = serialize_growth_series(series)
    decoded = deserialize_growth_series(encoded)

    assert decoded == tuple(series)


def test_deserialize_none_returns_empty_tuple() -> None:
    assert deserialize_growth_series(None) == ()


def test_deserialize_empty_list_returns_empty_tuple() -> None:
    assert deserialize_growth_series([]) == ()
