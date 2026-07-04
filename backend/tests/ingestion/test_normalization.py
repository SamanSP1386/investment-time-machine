import uuid
from datetime import date
from decimal import Decimal

from app.ingestion.normalization import (
    normalize_currency,
    normalize_dividend_record,
    normalize_indicator_observation,
    normalize_price_record,
    normalize_split_record,
    normalize_symbol,
)
from app.ingestion.providers.base import (
    RawDividendRecord,
    RawIndicatorObservation,
    RawPriceRecord,
    RawSplitRecord,
)


def test_normalize_symbol_strips_and_uppercases() -> None:
    assert normalize_symbol("  aapl ") == "AAPL"


def test_normalize_currency_strips_and_uppercases() -> None:
    assert normalize_currency("usd") == "USD"


def test_normalize_price_record_produces_decimal_and_int_types() -> None:
    asset_id = uuid.uuid4()
    raw = RawPriceRecord(
        symbol="AAPL",
        price_date=date(2024, 1, 2),
        open=100.1,
        high=102.2,
        low=99.9,
        close=101.5,
        adjusted_close=101.5,
        volume="1000",
    )

    normalized = normalize_price_record(raw, asset_id=asset_id, data_source="yfinance")

    assert normalized["asset_id"] == asset_id
    assert normalized["price_date"] == date(2024, 1, 2)
    assert isinstance(normalized["open_price"], Decimal)
    assert normalized["open_price"] == Decimal("100.1")
    assert isinstance(normalized["volume"], int)
    assert normalized["volume"] == 1000
    assert normalized["data_source"] == "yfinance"


def test_normalize_dividend_record_uppercases_currency() -> None:
    asset_id = uuid.uuid4()
    raw = RawDividendRecord(
        symbol="AAPL", ex_dividend_date=date(2024, 1, 2), amount=0.5, currency="usd"
    )

    normalized = normalize_dividend_record(raw, asset_id=asset_id, data_source="yfinance")

    assert normalized["currency"] == "USD"
    assert normalized["dividend_amount"] == Decimal("0.5")


def test_normalize_split_record_converts_ratio_to_decimal() -> None:
    asset_id = uuid.uuid4()
    raw = RawSplitRecord(symbol="AAPL", split_date=date(2024, 1, 2), ratio=4)

    normalized = normalize_split_record(raw, asset_id=asset_id, data_source="yfinance")

    assert normalized["split_ratio"] == Decimal("4")


def test_normalize_indicator_observation_converts_value_to_decimal() -> None:
    indicator_id = uuid.uuid4()
    raw = RawIndicatorObservation(
        indicator_code="CPIAUCSL", observation_date=date(2024, 1, 1), value="300.536"
    )

    normalized = normalize_indicator_observation(raw, indicator_id=indicator_id, data_source="fred")

    assert normalized["value"] == Decimal("300.536")
    assert normalized["indicator_id"] == indicator_id
