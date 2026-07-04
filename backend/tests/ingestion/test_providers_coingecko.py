"""Provider Layer tests for CoinGecko. No live network calls: `httpx.Client`
is constructed with a `MockTransport` so every response is scripted.
"""

from datetime import date

import httpx
import pytest

from app.ingestion.exceptions import (
    InvalidSymbolError,
    NetworkTimeoutError,
    ProviderUnavailableError,
    UnexpectedProviderResponseError,
)
from app.ingestion.providers.coingecko_provider import CoinGeckoProvider

_BASE_URL = "https://api.coingecko.com/api/v3"


def _client_returning(json_body: dict, status_code: int = 200) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json=json_body)

    return httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)


def _client_raising(exc: Exception) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        raise exc

    return httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)


def test_fetch_prices_approximates_ohlc_from_daily_price_and_matches_volume() -> None:
    body = {
        "prices": [[1704153600000, 42000.0], [1704240000000, 43000.0]],
        "total_volumes": [[1704153600000, 1_000_000], [1704240000000, 1_100_000]],
    }
    provider = CoinGeckoProvider(client=_client_returning(body))

    records = provider.fetch_prices("bitcoin", date(2024, 1, 2), date(2024, 1, 3))

    assert len(records) == 2
    assert records[0].price_date == date(2024, 1, 2)
    assert records[0].open == records[0].high == records[0].low == records[0].close == 42000.0
    assert records[0].adjusted_close == 42000.0
    assert records[0].volume == 1_000_000


def test_fetch_prices_raises_invalid_symbol_when_no_prices_returned() -> None:
    provider = CoinGeckoProvider(client=_client_returning({"prices": [], "total_volumes": []}))

    with pytest.raises(InvalidSymbolError):
        provider.fetch_prices("not-a-real-coin", date(2024, 1, 1), date(2024, 1, 2))


def test_fetch_prices_raises_invalid_symbol_on_404() -> None:
    provider = CoinGeckoProvider(client=_client_returning({}, status_code=404))

    with pytest.raises(InvalidSymbolError):
        provider.fetch_prices("not-a-real-coin", date(2024, 1, 1), date(2024, 1, 2))


def test_fetch_prices_raises_provider_unavailable_on_5xx() -> None:
    provider = CoinGeckoProvider(client=_client_returning({}, status_code=503))

    with pytest.raises(ProviderUnavailableError):
        provider.fetch_prices("bitcoin", date(2024, 1, 1), date(2024, 1, 2))


def test_fetch_prices_raises_unexpected_response_on_other_status() -> None:
    provider = CoinGeckoProvider(client=_client_returning({}, status_code=418))

    with pytest.raises(UnexpectedProviderResponseError):
        provider.fetch_prices("bitcoin", date(2024, 1, 1), date(2024, 1, 2))


def test_fetch_prices_translates_timeout() -> None:
    provider = CoinGeckoProvider(client=_client_raising(httpx.TimeoutException("boom")))

    with pytest.raises(NetworkTimeoutError):
        provider.fetch_prices("bitcoin", date(2024, 1, 1), date(2024, 1, 2))


def test_fetch_prices_translates_connect_error() -> None:
    provider = CoinGeckoProvider(client=_client_raising(httpx.ConnectError("boom")))

    with pytest.raises(ProviderUnavailableError):
        provider.fetch_prices("bitcoin", date(2024, 1, 1), date(2024, 1, 2))
