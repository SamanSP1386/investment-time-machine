"""Normalization Layer: converts already-validated, provider-shaped records
into platform-standard dicts matching the database column shapes exactly
(Decimal for every NUMERIC column, int for BIGINT, upper-cased symbols/
currency codes). The database never depends on a provider-specific schema —
everything provider-specific (yfinance's "Adj Close", CoinGecko's coin ids,
FRED's "." missing-value marker) is resolved before this point, by the
Provider Layer and Validation Layer respectively. Normalization assumes its
input already passed validation — it does not re-validate.
"""

import uuid
from decimal import Decimal

from app.ingestion.providers.base import (
    RawDividendRecord,
    RawIndicatorObservation,
    RawPriceRecord,
    RawSplitRecord,
)


def _decimal(value: object) -> Decimal:
    return Decimal(str(value))


def normalize_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def normalize_currency(currency: str) -> str:
    return currency.strip().upper()


def normalize_price_record(
    record: RawPriceRecord, *, asset_id: uuid.UUID, data_source: str
) -> dict:
    return {
        "asset_id": asset_id,
        "price_date": record.price_date,
        "open_price": _decimal(record.open),
        "high_price": _decimal(record.high),
        "low_price": _decimal(record.low),
        "close_price": _decimal(record.close),
        "adjusted_close_price": _decimal(record.adjusted_close),
        "volume": int(_decimal(record.volume)),
        "data_source": data_source,
    }


def normalize_dividend_record(
    record: RawDividendRecord, *, asset_id: uuid.UUID, data_source: str
) -> dict:
    return {
        "asset_id": asset_id,
        "ex_dividend_date": record.ex_dividend_date,
        "dividend_amount": _decimal(record.amount),
        "currency": normalize_currency(record.currency),
        "data_source": data_source,
    }


def normalize_split_record(
    record: RawSplitRecord, *, asset_id: uuid.UUID, data_source: str
) -> dict:
    return {
        "asset_id": asset_id,
        "split_date": record.split_date,
        "split_ratio": _decimal(record.ratio),
        "data_source": data_source,
    }


def normalize_indicator_observation(
    record: RawIndicatorObservation, *, indicator_id: uuid.UUID, data_source: str
) -> dict:
    return {
        "indicator_id": indicator_id,
        "observation_date": record.observation_date,
        "value": _decimal(record.value),
        "data_source": data_source,
    }
