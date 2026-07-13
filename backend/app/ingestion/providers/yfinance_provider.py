"""Provider Layer adapter for stocks/ETFs via yfinance. Communication only —
no validation, no normalization, no database access (see providers/base.py).

**Deprecated (KI-044, see ADR-046).** yfinance 0.2.44's internal crumb-
negotiation endpoint is rate-limited (HTTP 429) in most environments and
yfinance retries against the same rate-limited endpoint without backing off,
so this adapter fails for essentially every symbol today. Not deleted —
kept registered (`--provider yfinance`) for any environment where it happens
to work — but `YahooChartProvider` (`yahoo_chart_provider.py`,
`--provider yahoo_chart`) is the recommended provider for stocks, ETFs, and
crypto going forward: same underlying Yahoo data, reached by a direct HTTP
GET against the chart endpoint instead of yfinance's crumb-gated wrapper.
"""

import logging
from datetime import date, timedelta
from typing import Any

import requests
import yfinance as yf

from app.ingestion.exceptions import (
    InvalidSymbolError,
    NetworkTimeoutError,
    ProviderUnavailableError,
    UnexpectedProviderResponseError,
)
from app.ingestion.providers.base import RawDividendRecord, RawPriceRecord, RawSplitRecord

logger = logging.getLogger(__name__)

_REQUIRED_PRICE_COLUMNS = {"Open", "High", "Low", "Close", "Adj Close", "Volume"}


class YFinanceProvider:
    """Stocks and ETFs. Also the only provider that supplies dividends and
    stock splits (crypto/economic-indicator providers have no equivalent)."""

    name = "yfinance"

    def fetch_prices(self, symbol: str, start: date, end: date) -> list[RawPriceRecord]:
        history = self._fetch_history(symbol, start, end)
        if history.empty:
            raise InvalidSymbolError(symbol, self.name)

        missing = _REQUIRED_PRICE_COLUMNS - set(history.columns)
        if missing:
            raise UnexpectedProviderResponseError(
                f"yfinance history for '{symbol}' is missing expected columns: {missing}"
            )

        return [
            RawPriceRecord(
                symbol=symbol,
                price_date=index.date(),
                open=row["Open"],
                high=row["High"],
                low=row["Low"],
                close=row["Close"],
                adjusted_close=row["Adj Close"],
                volume=row["Volume"],
            )
            for index, row in history.iterrows()
        ]

    def fetch_dividends(self, symbol: str, start: date, end: date) -> list[RawDividendRecord]:
        history = self._fetch_history(symbol, start, end)
        if history.empty or "Dividends" not in history.columns:
            return []

        return [
            RawDividendRecord(symbol=symbol, ex_dividend_date=index.date(), amount=row["Dividends"])
            for index, row in history.iterrows()
            if row["Dividends"] and row["Dividends"] > 0
        ]

    def fetch_splits(self, symbol: str, start: date, end: date) -> list[RawSplitRecord]:
        history = self._fetch_history(symbol, start, end)
        if history.empty or "Stock Splits" not in history.columns:
            return []

        return [
            RawSplitRecord(symbol=symbol, split_date=index.date(), ratio=row["Stock Splits"])
            for index, row in history.iterrows()
            if row["Stock Splits"] and row["Stock Splits"] > 0
        ]

    def _fetch_history(self, symbol: str, start: date, end: date) -> Any:
        """Isolated so tests can patch this single method instead of mocking
        yfinance's internals. yfinance's `end` is exclusive; extended by one
        day so the caller's `end` date (inclusive, matching the rest of the
        platform's date-range convention) is actually included."""
        try:
            ticker = yf.Ticker(symbol)
            return ticker.history(start=start, end=end + timedelta(days=1), auto_adjust=False)
        except requests.exceptions.Timeout as exc:
            raise NetworkTimeoutError(f"yfinance request timed out for '{symbol}'") from exc
        except requests.exceptions.ConnectionError as exc:
            raise ProviderUnavailableError(
                f"yfinance could not be reached for '{symbol}': {exc}"
            ) from exc
        except Exception as exc:
            # yfinance does not expose a stable, documented exception
            # hierarchy of its own — this boundary translates *any*
            # third-party failure into our explicit taxonomy rather than
            # letting an unclassified exception leak past the Provider
            # Layer. This is deliberate boundary translation, not generic
            # error suppression: the original exception is chained (`from
            # exc`) and re-raised immediately as an actionable, named type.
            logger.warning("yfinance request failed for %s: %s", symbol, exc)
            raise ProviderUnavailableError(
                f"yfinance request failed unexpectedly for '{symbol}': {exc}"
            ) from exc
