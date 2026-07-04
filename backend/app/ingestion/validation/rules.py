"""Validation Layer: every record from any provider is untrusted until it
passes these checks. Each `validate_*` function returns a list of rejection
reason codes — an empty list means the record is valid. Reasons are returned
rather than raised so the orchestrator can collect per-record rejections
into the Import Report instead of aborting an entire import on the first bad
row. Nothing here repairs or fabricates a value — a record either passes as
observed, or is rejected with a reason.
"""

from collections.abc import Callable, Hashable
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import TypeVar

from app.ingestion.providers.base import (
    RawDividendRecord,
    RawIndicatorObservation,
    RawPriceRecord,
    RawSplitRecord,
)

# Allows for timezone/rounding slack at the "today" boundary — not a
# tolerance for genuinely future-dated data.
_MAX_FUTURE_SLACK = timedelta(days=1)

T = TypeVar("T")


def _to_decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def validate_price_record(record: RawPriceRecord) -> list[str]:
    reasons: list[str] = []

    if not record.symbol or not record.symbol.strip():
        reasons.append("missing_symbol")
    if record.price_date > date.today() + _MAX_FUTURE_SLACK:
        reasons.append("future_date")

    parsed = {
        "open": _to_decimal(record.open),
        "high": _to_decimal(record.high),
        "low": _to_decimal(record.low),
        "close": _to_decimal(record.close),
        "adjusted_close": _to_decimal(record.adjusted_close),
    }
    for field_name, value in parsed.items():
        if value is None:
            reasons.append(f"malformed_{field_name}")

    # Magnitude/consistency checks only make sense once every field parsed
    # cleanly — comparing a None would raise, not "detect" anything useful.
    if all(value is not None for value in parsed.values()):
        if any(value <= 0 for value in parsed.values()):
            reasons.append("non_positive_price")
        elif parsed["high"] < parsed["low"]:
            reasons.append("high_less_than_low")
        elif not (parsed["low"] <= parsed["open"] <= parsed["high"]):
            reasons.append("open_out_of_high_low_range")
        elif not (parsed["low"] <= parsed["close"] <= parsed["high"]):
            reasons.append("close_out_of_high_low_range")

    volume = _to_decimal(record.volume)
    if volume is None:
        reasons.append("malformed_volume")
    elif volume < 0:
        reasons.append("negative_volume")

    return reasons


def validate_dividend_record(record: RawDividendRecord) -> list[str]:
    reasons: list[str] = []

    if not record.symbol or not record.symbol.strip():
        reasons.append("missing_symbol")
    if record.ex_dividend_date > date.today() + _MAX_FUTURE_SLACK:
        reasons.append("future_date")

    amount = _to_decimal(record.amount)
    if amount is None:
        reasons.append("malformed_amount")
    elif amount <= 0:
        reasons.append("non_positive_amount")

    if not record.currency or len(record.currency) != 3:
        reasons.append("invalid_currency_code")

    return reasons


def validate_split_record(record: RawSplitRecord) -> list[str]:
    reasons: list[str] = []

    if not record.symbol or not record.symbol.strip():
        reasons.append("missing_symbol")
    if record.split_date > date.today() + _MAX_FUTURE_SLACK:
        reasons.append("future_date")

    ratio = _to_decimal(record.ratio)
    if ratio is None:
        reasons.append("malformed_ratio")
    elif ratio <= 0:
        reasons.append("non_positive_ratio")

    return reasons


def validate_indicator_observation(record: RawIndicatorObservation) -> list[str]:
    reasons: list[str] = []

    if not record.indicator_code or not record.indicator_code.strip():
        reasons.append("missing_indicator_code")
    if record.observation_date > date.today() + _MAX_FUTURE_SLACK:
        reasons.append("future_date")

    if record.value is None:
        # The provider's own "no observation this period" marker (e.g.
        # FRED's "."). Not malformed data — just nothing to store — but it
        # is not a storable value either, so it is rejected the same way.
        reasons.append("missing_value")
    elif _to_decimal(record.value) is None:
        reasons.append("malformed_value")

    return reasons


def find_duplicate_keys(records: list[T], key_fn: Callable[[T], Hashable]) -> set[Hashable]:
    """In-batch duplicate detection: a provider bug (or a response spanning
    a merged multi-request fetch) could hand back the same natural key twice
    in a single response. Cross-import idempotency — re-running the same
    import days later — is a Storage Layer concern (ON CONFLICT DO NOTHING),
    not this."""
    seen: set[Hashable] = set()
    duplicates: set[Hashable] = set()
    for record in records:
        key = key_fn(record)
        if key in seen:
            duplicates.add(key)
        seen.add(key)
    return duplicates
