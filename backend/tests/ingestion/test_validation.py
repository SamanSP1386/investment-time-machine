from datetime import date, timedelta

from app.ingestion.providers.base import (
    RawDividendRecord,
    RawIndicatorObservation,
    RawPriceRecord,
    RawSplitRecord,
)
from app.ingestion.validation import (
    find_duplicate_keys,
    validate_dividend_record,
    validate_indicator_observation,
    validate_price_record,
    validate_split_record,
)


def _price(**overrides) -> RawPriceRecord:
    defaults = dict(
        symbol="AAPL",
        price_date=date(2024, 1, 2),
        open=100.0,
        high=102.0,
        low=99.0,
        close=101.0,
        adjusted_close=101.0,
        volume=1000,
    )
    defaults.update(overrides)
    return RawPriceRecord(**defaults)


def test_valid_price_record_has_no_rejection_reasons() -> None:
    assert validate_price_record(_price()) == []


def test_price_record_rejects_missing_symbol() -> None:
    assert "missing_symbol" in validate_price_record(_price(symbol=""))


def test_price_record_rejects_future_date() -> None:
    future = date.today() + timedelta(days=30)
    assert "future_date" in validate_price_record(_price(price_date=future))


def test_price_record_rejects_non_positive_price() -> None:
    reasons = validate_price_record(_price(open=0, high=102.0, low=99.0, close=101.0))
    assert "non_positive_price" in reasons


def test_price_record_rejects_negative_volume() -> None:
    assert "negative_volume" in validate_price_record(_price(volume=-5))


def test_price_record_rejects_high_less_than_low() -> None:
    reasons = validate_price_record(_price(high=90.0, low=99.0))
    assert "high_less_than_low" in reasons


def test_price_record_rejects_open_outside_high_low_range() -> None:
    reasons = validate_price_record(_price(open=200.0, high=102.0, low=99.0))
    assert "open_out_of_high_low_range" in reasons


def test_price_record_rejects_close_outside_high_low_range() -> None:
    reasons = validate_price_record(_price(close=5.0, high=102.0, low=99.0))
    assert "close_out_of_high_low_range" in reasons


def test_price_record_rejects_malformed_values_without_raising() -> None:
    reasons = validate_price_record(_price(open="not-a-number"))
    assert "malformed_open" in reasons


def test_dividend_record_rejects_non_positive_amount() -> None:
    record = RawDividendRecord(symbol="AAPL", ex_dividend_date=date(2024, 1, 2), amount=0)
    assert "non_positive_amount" in validate_dividend_record(record)


def test_dividend_record_accepts_valid_record() -> None:
    record = RawDividendRecord(symbol="AAPL", ex_dividend_date=date(2024, 1, 2), amount=0.5)
    assert validate_dividend_record(record) == []


def test_dividend_record_rejects_invalid_currency_code() -> None:
    record = RawDividendRecord(
        symbol="AAPL", ex_dividend_date=date(2024, 1, 2), amount=0.5, currency="US"
    )
    assert "invalid_currency_code" in validate_dividend_record(record)


def test_split_record_rejects_non_positive_ratio() -> None:
    record = RawSplitRecord(symbol="AAPL", split_date=date(2024, 1, 2), ratio=0)
    assert "non_positive_ratio" in validate_split_record(record)


def test_split_record_accepts_valid_record() -> None:
    record = RawSplitRecord(symbol="AAPL", split_date=date(2024, 1, 2), ratio=4.0)
    assert validate_split_record(record) == []


def test_indicator_observation_rejects_missing_value_marker() -> None:
    record = RawIndicatorObservation(
        indicator_code="CPIAUCSL", observation_date=date(2024, 1, 1), value=None
    )
    assert "missing_value" in validate_indicator_observation(record)


def test_indicator_observation_accepts_valid_value() -> None:
    record = RawIndicatorObservation(
        indicator_code="CPIAUCSL", observation_date=date(2024, 1, 1), value="300.5"
    )
    assert validate_indicator_observation(record) == []


def test_find_duplicate_keys_detects_repeated_natural_key() -> None:
    records = [
        _price(price_date=date(2024, 1, 2)),
        _price(price_date=date(2024, 1, 2)),
        _price(price_date=date(2024, 1, 3)),
    ]
    duplicates = find_duplicate_keys(records, key_fn=lambda r: r.price_date)
    assert duplicates == {date(2024, 1, 2)}


def test_find_duplicate_keys_returns_empty_set_when_all_unique() -> None:
    records = [_price(price_date=date(2024, 1, 2)), _price(price_date=date(2024, 1, 3))]
    assert find_duplicate_keys(records, key_fn=lambda r: r.price_date) == set()
