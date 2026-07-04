"""Provider Layer tests for FRED. No live network calls: `httpx.Client` is
constructed with a `MockTransport` so every response is scripted.
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
from app.ingestion.providers.fred_provider import FredProvider

_BASE_URL = "https://api.stlouisfed.org/fred"


def _client_returning(
    json_body: dict | None = None, status_code: int = 200, text_body: str | None = None
) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        if text_body is not None:
            return httpx.Response(status_code, text=text_body)
        return httpx.Response(status_code, json=json_body or {})

    return httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)


def _client_raising(exc: Exception) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        raise exc

    return httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)


def test_fetch_observations_parses_values_and_missing_marker() -> None:
    body = {
        "observations": [
            {"date": "2024-01-01", "value": "300.5"},
            {"date": "2024-02-01", "value": "."},
        ]
    }
    provider = FredProvider(client=_client_returning(body), api_key="test-key")

    records = provider.fetch_observations("CPIAUCSL", date(2024, 1, 1), date(2024, 2, 1))

    assert len(records) == 2
    assert records[0].observation_date == date(2024, 1, 1)
    assert records[0].value == "300.5"
    assert records[1].value is None  # FRED's "." marker, never coerced to 0


def test_fetch_observations_raises_invalid_symbol_when_empty() -> None:
    provider = FredProvider(client=_client_returning({"observations": []}), api_key="test-key")

    with pytest.raises(InvalidSymbolError):
        provider.fetch_observations("NOTREAL", date(2024, 1, 1), date(2024, 2, 1))


def test_fetch_observations_raises_invalid_symbol_on_400_series_not_found() -> None:
    provider = FredProvider(
        client=_client_returning(status_code=400, text_body="The series does not exist."),
        api_key="test-key",
    )

    with pytest.raises(InvalidSymbolError):
        provider.fetch_observations("NOTREAL", date(2024, 1, 1), date(2024, 2, 1))


def test_fetch_observations_raises_unexpected_response_on_other_400() -> None:
    provider = FredProvider(
        client=_client_returning(status_code=400, text_body="Bad Request. Missing api_key."),
        api_key="",
    )

    with pytest.raises(UnexpectedProviderResponseError):
        provider.fetch_observations("CPIAUCSL", date(2024, 1, 1), date(2024, 2, 1))


def test_fetch_observations_raises_provider_unavailable_on_5xx() -> None:
    provider = FredProvider(client=_client_returning(status_code=503), api_key="test-key")

    with pytest.raises(ProviderUnavailableError):
        provider.fetch_observations("CPIAUCSL", date(2024, 1, 1), date(2024, 2, 1))


def test_fetch_observations_translates_timeout() -> None:
    provider = FredProvider(client=_client_raising(httpx.TimeoutException("boom")), api_key="k")

    with pytest.raises(NetworkTimeoutError):
        provider.fetch_observations("CPIAUCSL", date(2024, 1, 1), date(2024, 2, 1))


def test_fetch_observations_translates_connect_error() -> None:
    provider = FredProvider(client=_client_raising(httpx.ConnectError("boom")), api_key="k")

    with pytest.raises(ProviderUnavailableError):
        provider.fetch_observations("CPIAUCSL", date(2024, 1, 1), date(2024, 2, 1))
