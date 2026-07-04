"""Provider Layer adapter for economic indicators (CPI, unemployment, etc.)
via FRED. Communication only — no validation, no normalization, no database
access (see providers/base.py).
"""

import logging
from datetime import date
from typing import Any

import httpx

from app.core.config import get_settings
from app.ingestion.exceptions import (
    InvalidSymbolError,
    NetworkTimeoutError,
    ProviderUnavailableError,
    UnexpectedProviderResponseError,
)
from app.ingestion.providers.base import RawIndicatorObservation

logger = logging.getLogger(__name__)


class FredProvider:
    """Economic indicators, identified by FRED series id (e.g. "CPIAUCSL")."""

    name = "fred"

    def __init__(
        self,
        client: httpx.Client | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
    ) -> None:
        settings = get_settings()
        self._api_key = api_key if api_key is not None else settings.fred_api_key
        resolved_timeout = (
            timeout if timeout is not None else settings.ingestion_http_timeout_seconds
        )
        self._client = client or httpx.Client(
            base_url="https://api.stlouisfed.org/fred", timeout=resolved_timeout
        )

    def fetch_observations(
        self, indicator_code: str, start: date, end: date
    ) -> list[RawIndicatorObservation]:
        data = self._fetch_series_observations(indicator_code, start, end)
        observations = data.get("observations", [])

        if not observations:
            raise InvalidSymbolError(indicator_code, self.name)

        records = []
        for obs in observations:
            raw_date = obs.get("date")
            if raw_date is None:
                raise UnexpectedProviderResponseError(
                    f"FRED observation for '{indicator_code}' is missing a date: {obs}"
                )
            raw_value = obs.get("value")
            # FRED's own "no observation this period" marker is the literal
            # string "." — treated as None (missing), never coerced to 0.
            value = None if raw_value in (None, ".", "") else raw_value
            records.append(
                RawIndicatorObservation(
                    indicator_code=indicator_code,
                    observation_date=date.fromisoformat(raw_date),
                    value=value,
                )
            )
        return records

    def _fetch_series_observations(
        self, indicator_code: str, start: date, end: date
    ) -> dict[str, Any]:
        try:
            response = self._client.get(
                "/series/observations",
                params={
                    "series_id": indicator_code,
                    "api_key": self._api_key,
                    "file_type": "json",
                    "observation_start": start.isoformat(),
                    "observation_end": end.isoformat(),
                },
            )
        except httpx.TimeoutException as exc:
            raise NetworkTimeoutError(f"FRED request timed out for '{indicator_code}'") from exc
        except httpx.ConnectError as exc:
            raise ProviderUnavailableError(
                f"FRED could not be reached for '{indicator_code}': {exc}"
            ) from exc

        if response.status_code == 400:
            # FRED returns 400 for both malformed requests and unknown
            # series ids — inspect the body to distinguish before deciding.
            body_lower = response.text.lower()
            if "does not exist" in body_lower or "bad-key-series-id" in body_lower:
                raise InvalidSymbolError(indicator_code, self.name)
            raise UnexpectedProviderResponseError(
                f"FRED rejected the request for '{indicator_code}': {response.text[:200]}"
            )
        if response.status_code >= 500:
            raise ProviderUnavailableError(
                f"FRED server error {response.status_code} for '{indicator_code}'"
            )
        if response.status_code != 200:
            raise UnexpectedProviderResponseError(
                f"FRED returned status {response.status_code} for '{indicator_code}': "
                f"{response.text[:200]}"
            )

        try:
            return response.json()
        except ValueError as exc:
            raise UnexpectedProviderResponseError(
                f"FRED response for '{indicator_code}' was not valid JSON"
            ) from exc
