"""Provider Layer tests for yfinance. No live network calls: `_fetch_history`
is patched directly (isolating our adapter logic from yfinance's internals),
and the internal `yf.Ticker` construction is patched separately to test
exception translation.
"""

from datetime import date
from unittest.mock import patch

import pandas as pd
import pytest
import requests

from app.ingestion.exceptions import (
    InvalidSymbolError,
    NetworkTimeoutError,
    ProviderUnavailableError,
    UnexpectedProviderResponseError,
)
from app.ingestion.providers.yfinance_provider import YFinanceProvider


def _make_history_df() -> pd.DataFrame:
    index = pd.to_datetime(["2024-01-02", "2024-01-03"])
    return pd.DataFrame(
        {
            "Open": [100.0, 101.0],
            "High": [102.0, 103.0],
            "Low": [99.0, 100.0],
            "Close": [101.0, 102.0],
            "Adj Close": [101.0, 102.0],
            "Volume": [1000, 1100],
            "Dividends": [0.0, 0.5],
            "Stock Splits": [0.0, 0.0],
        },
        index=index,
    )


def test_fetch_prices_returns_raw_records() -> None:
    provider = YFinanceProvider()
    with patch.object(provider, "_fetch_history", return_value=_make_history_df()):
        records = provider.fetch_prices("AAPL", date(2024, 1, 2), date(2024, 1, 3))

    assert len(records) == 2
    assert records[0].symbol == "AAPL"
    assert records[0].price_date == date(2024, 1, 2)
    assert records[0].close == 101.0
    assert records[0].adjusted_close == 101.0


def test_fetch_prices_raises_invalid_symbol_on_empty_history() -> None:
    provider = YFinanceProvider()
    with patch.object(provider, "_fetch_history", return_value=pd.DataFrame()):
        with pytest.raises(InvalidSymbolError):
            provider.fetch_prices("NOTREAL", date(2024, 1, 1), date(2024, 1, 2))


def test_fetch_prices_raises_unexpected_response_on_missing_columns() -> None:
    provider = YFinanceProvider()
    incomplete = pd.DataFrame({"Open": [1.0]}, index=pd.to_datetime(["2024-01-01"]))
    with patch.object(provider, "_fetch_history", return_value=incomplete):
        with pytest.raises(UnexpectedProviderResponseError):
            provider.fetch_prices("AAPL", date(2024, 1, 1), date(2024, 1, 1))


def test_fetch_dividends_filters_zero_rows() -> None:
    provider = YFinanceProvider()
    with patch.object(provider, "_fetch_history", return_value=_make_history_df()):
        records = provider.fetch_dividends("AAPL", date(2024, 1, 2), date(2024, 1, 3))

    assert len(records) == 1
    assert records[0].ex_dividend_date == date(2024, 1, 3)
    assert records[0].amount == 0.5


def test_fetch_splits_returns_empty_when_no_splits_occurred() -> None:
    provider = YFinanceProvider()
    with patch.object(provider, "_fetch_history", return_value=_make_history_df()):
        records = provider.fetch_splits("AAPL", date(2024, 1, 2), date(2024, 1, 3))

    assert records == []


def test_fetch_history_translates_timeout_to_network_timeout_error() -> None:
    provider = YFinanceProvider()
    with patch("app.ingestion.providers.yfinance_provider.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.history.side_effect = requests.exceptions.Timeout("boom")
        with pytest.raises(NetworkTimeoutError):
            provider.fetch_prices("AAPL", date(2024, 1, 1), date(2024, 1, 2))


def test_fetch_history_translates_connection_error_to_provider_unavailable() -> None:
    provider = YFinanceProvider()
    with patch("app.ingestion.providers.yfinance_provider.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.history.side_effect = requests.exceptions.ConnectionError("boom")
        with pytest.raises(ProviderUnavailableError):
            provider.fetch_prices("AAPL", date(2024, 1, 1), date(2024, 1, 2))


def test_fetch_history_translates_unknown_error_to_provider_unavailable() -> None:
    provider = YFinanceProvider()
    with patch("app.ingestion.providers.yfinance_provider.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.history.side_effect = RuntimeError("unclassified yfinance error")
        with pytest.raises(ProviderUnavailableError):
            provider.fetch_prices("AAPL", date(2024, 1, 1), date(2024, 1, 2))
