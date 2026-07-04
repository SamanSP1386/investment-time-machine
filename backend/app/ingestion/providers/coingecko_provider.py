"""Provider Layer adapter for crypto via CoinGecko. Communication only — no
validation, no normalization, no database access (see providers/base.py).

Known, documented limitation: CoinGecko's free-tier `/market_chart/range`
endpoint (the only one that supports an arbitrary historical date range —
the `/ohlc` endpoint is limited to a fixed lookback window from "now" and
cannot backfill history) returns a single price observation per day, not
true Open/High/Low/Close. Rather than fabricate High/Low values that were
never observed (a direct violation of "Historical Truth Is Sacred"), this
adapter sets open = high = low = close = that single observed price and
relies on the orchestrator to attach an explicit Import Report warning
disclosing the approximation. Crypto has no dividends or splits, so this
provider does not implement DividendProvider/SplitProvider.
"""

import logging
from datetime import UTC, date, datetime
from typing import Any

import httpx

from app.core.config import get_settings
from app.ingestion.exceptions import (
    InvalidSymbolError,
    NetworkTimeoutError,
    ProviderUnavailableError,
    UnexpectedProviderResponseError,
)
from app.ingestion.providers.base import RawPriceRecord

logger = logging.getLogger(__name__)

COINGECKO_OHLC_APPROXIMATION_WARNING = (
    "CoinGecko free-tier API returns one price observation per day, not true "
    "OHLC — open/high/low were set equal to the observed close price for "
    "this import, not fabricated from unavailable intraday data."
)


class CoinGeckoProvider:
    """Crypto. `symbol` here is CoinGecko's coin id (e.g. "bitcoin"), not a
    ticker — CoinGecko has no ticker-to-id endpoint on the free tier, so
    callers are responsible for supplying the id. This is a known constraint,
    not an ingestion bug."""

    name = "coingecko"

    def __init__(self, client: httpx.Client | None = None, timeout: float | None = None) -> None:
        resolved_timeout = (
            timeout if timeout is not None else get_settings().ingestion_http_timeout_seconds
        )
        self._client = client or httpx.Client(
            base_url="https://api.coingecko.com/api/v3", timeout=resolved_timeout
        )

    def fetch_prices(self, symbol: str, start: date, end: date) -> list[RawPriceRecord]:
        data = self._fetch_market_chart(symbol, start, end)
        prices: list[list[float]] = data.get("prices", [])
        volumes: list[list[float]] = data.get("total_volumes", [])

        if not prices:
            raise InvalidSymbolError(symbol, self.name)

        volume_by_date = {
            self._to_date(ts_ms): volume for ts_ms, volume in volumes
        }  # later timestamps on the same day overwrite earlier ones deliberately
        price_by_date = {self._to_date(ts_ms): price for ts_ms, price in prices}

        return [
            RawPriceRecord(
                symbol=symbol,
                price_date=day,
                open=price,
                high=price,
                low=price,
                close=price,
                adjusted_close=price,  # no split/dividend concept for crypto: close IS adjusted
                volume=volume_by_date.get(day, 0),
            )
            for day, price in sorted(price_by_date.items())
            if start <= day <= end
        ]

    @staticmethod
    def _to_date(timestamp_ms: float) -> date:
        return datetime.fromtimestamp(timestamp_ms / 1000, tz=UTC).date()

    def _fetch_market_chart(self, coin_id: str, start: date, end: date) -> dict[str, Any]:
        from_ts = int(datetime.combine(start, datetime.min.time(), tzinfo=UTC).timestamp())
        to_ts = int(datetime.combine(end, datetime.min.time(), tzinfo=UTC).timestamp()) + 86400

        try:
            response = self._client.get(
                f"/coins/{coin_id}/market_chart/range",
                params={"vs_currency": "usd", "from": from_ts, "to": to_ts},
            )
        except httpx.TimeoutException as exc:
            raise NetworkTimeoutError(f"CoinGecko request timed out for '{coin_id}'") from exc
        except httpx.ConnectError as exc:
            raise ProviderUnavailableError(
                f"CoinGecko could not be reached for '{coin_id}': {exc}"
            ) from exc

        if response.status_code == 404:
            raise InvalidSymbolError(coin_id, self.name)
        if response.status_code >= 500:
            raise ProviderUnavailableError(
                f"CoinGecko server error {response.status_code} for '{coin_id}'"
            )
        if response.status_code != 200:
            raise UnexpectedProviderResponseError(
                f"CoinGecko returned status {response.status_code} for '{coin_id}': "
                f"{response.text[:200]}"
            )

        try:
            return response.json()
        except ValueError as exc:
            raise UnexpectedProviderResponseError(
                f"CoinGecko response for '{coin_id}' was not valid JSON"
            ) from exc
