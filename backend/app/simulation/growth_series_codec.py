"""JSON encode/decode for `Simulation.growth_series` (Founder Decision 014,
Option A). Storage shape: a JSON array of {"point_date": "YYYY-MM-DD",
"value": "<fixed-point string>"} objects -- values are always strings, never
JSON numbers, matching `app.api.v1.schemas.common.DecimalStr`'s Decimal-safe
convention (a JS client's float64 JSON.parse must never be able to round a
stored currency figure). Deliberately separate from `app.simulation.formulas`
(pure calculation, no I/O-adjacent concerns) and from the API schema layer
(this is the DB storage encoding, not the wire format -- they happen to share
the same field names today, but that's coincidence, not a contract).
"""

from datetime import date
from decimal import Decimal

from app.simulation.formulas import GrowthSeriesPoint


def serialize_growth_series(series: list[GrowthSeriesPoint]) -> list[dict[str, str]]:
    return [
        {"point_date": point.point_date.isoformat(), "value": format(point.value, "f")}
        for point in series
    ]


def deserialize_growth_series(data: list[dict] | None) -> tuple[GrowthSeriesPoint, ...]:
    """`data` is `None` for a row never persisted/backfilled (or a
    non-completed simulation) -- returns an empty tuple, matching the
    pre-FD-014 empty-list default callers already handle."""
    if not data:
        return ()
    return tuple(
        GrowthSeriesPoint(
            point_date=date.fromisoformat(point["point_date"]),
            value=Decimal(point["value"]),
        )
        for point in data
    )
