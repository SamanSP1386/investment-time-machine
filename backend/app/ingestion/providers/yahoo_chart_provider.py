"""Provider Layer adapter for stocks/ETFs/crypto via Yahoo Finance's public
chart JSON endpoint (`query2.finance.yahoo.com/v8/finance/chart/...`), called
directly over HTTP rather than through the `yfinance` library. Communication
only — no validation, no normalization, no database access (see
providers/base.py).

Exists because `YFinanceProvider` (yfinance 0.2.44) is blocked by KI-044:
yfinance's own internal crumb-negotiation endpoint
(`query1.finance.yahoo.com/v1/test/getcrumb`) is rate-limited (HTTP 429) and
yfinance does not back off, so every request through it fails. The *chart
data* endpoint itself has no such crumb requirement and is directly
reachable with a plain HTTP GET and a standard browser User-Agent header —
this was independently confirmed during KI-016's split-adjustment
verification (a read-only investigative fetch, not this adapter) and is
reconfirmed, live, by this adapter's own tests and the KI-044 resolution
evidence. See ADR-046 for the full provider-choice rationale (vs. Stooq, vs.
a `yfinance` version bump).

This is a different provider from `YFinanceProvider` — same underlying data
source (Yahoo), different transport (direct HTTP vs. the yfinance library),
registered separately (`data_source="yahoo_chart"`) so provenance stays
honest about which code path actually produced a given row.
"""

import logging
import threading
import time
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
from app.ingestion.providers.base import RawDividendRecord, RawPriceRecord, RawSplitRecord

logger = logging.getLogger(__name__)

# A standard desktop browser User-Agent — the exact factor that makes the
# chart endpoint's plain HTTP GET succeed where a bare/default-UA request or
# yfinance's own crumb-gated request currently does not (KI-044/KI-016).
# Not a spoofing/evasion trick: this is the platform's ordinary, publicly
# documented behavior for a browser tab, not an attempt to defeat a
# technical access control (see ADR-046's terms-of-use discussion).
_DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

# Politeness controls (KI-044/KI-015's "no rate-limit awareness" gap, closed
# for this provider specifically): a minimum spacing between consecutive
# requests, plus a small bounded retry with exponential backoff on a 429 or
# 5xx response, so a single request into a brief rate-limit window doesn't
# fail the whole import — and so this adapter never hammers Yahoo's endpoint
# the way yfinance's own un-backed-off crumb retry does (the exact failure
# mode KI-044 root-caused).
_MIN_REQUEST_INTERVAL_SECONDS = 0.5
_MAX_RETRIES = 3
_BACKOFF_BASE_SECONDS = 1.0

_throttle_lock = threading.Lock()
_last_request_at = 0.0


def _throttle() -> None:
    global _last_request_at
    with _throttle_lock:
        elapsed = time.monotonic() - _last_request_at
        remaining = _MIN_REQUEST_INTERVAL_SECONDS - elapsed
        if remaining > 0:
            time.sleep(remaining)
        _last_request_at = time.monotonic()


class YahooChartProvider:
    """Stocks, ETFs, and crypto (e.g. `BTC-USD`, `ETH-USD` — Yahoo's own
    pseudo-ticker convention, same symbol shape yfinance/DevSeedProvider
    already use). Also supplies dividends and stock splits via the same
    endpoint's `events` payload, mirroring `YFinanceProvider`'s capability
    surface."""

    name = "yahoo_chart"

    def __init__(self, client: httpx.Client | None = None, timeout: float | None = None) -> None:
        resolved_timeout = (
            timeout if timeout is not None else get_settings().ingestion_http_timeout_seconds
        )
        self._client = client or httpx.Client(
            base_url="https://query2.finance.yahoo.com",
            timeout=resolved_timeout,
            headers={"User-Agent": _DEFAULT_USER_AGENT},
        )

    def fetch_prices(self, symbol: str, start: date, end: date) -> list[RawPriceRecord]:
        result = self._fetch_chart(symbol, start, end)
        timestamps: list[int] = result.get("timestamp") or []
        quote = (result.get("indicators", {}).get("quote") or [{}])[0]
        adjclose_series = (result.get("indicators", {}).get("adjclose") or [{}])[0].get("adjclose")

        opens = quote.get("open") or []
        highs = quote.get("high") or []
        lows = quote.get("low") or []
        closes = quote.get("close") or []
        volumes = quote.get("volume") or []

        records: list[RawPriceRecord] = []
        for i, ts in enumerate(timestamps):
            o, hi, lo, c, v = (
                _at(opens, i),
                _at(highs, i),
                _at(lows, i),
                _at(closes, i),
                _at(volumes, i),
            )
            # Yahoo returns a null row for a session with no trade data
            # (observed on real responses, e.g. a rare data gap) — skipped
            # rather than fabricating a value for a field that was never
            # actually observed ("Historical Truth Is Sacred").
            if None in (o, hi, lo, c, v):
                continue
            adjusted = _at(adjclose_series, i) if adjclose_series else c
            price_date = datetime.fromtimestamp(ts, tz=UTC).date()
            if not (start <= price_date <= end):
                continue
            records.append(
                RawPriceRecord(
                    symbol=symbol,
                    price_date=price_date,
                    open=o,
                    high=hi,
                    low=lo,
                    close=c,
                    adjusted_close=adjusted if adjusted is not None else c,
                    volume=v,
                )
            )

        if not records:
            raise InvalidSymbolError(symbol, self.name)
        return records

    def fetch_dividends(self, symbol: str, start: date, end: date) -> list[RawDividendRecord]:
        result = self._fetch_chart(symbol, start, end)
        dividends = result.get("events", {}).get("dividends") or {}
        records: list[RawDividendRecord] = []
        for entry in dividends.values():
            ex_date = datetime.fromtimestamp(entry["date"], tz=UTC).date()
            if start <= ex_date <= end:
                records.append(
                    RawDividendRecord(
                        symbol=symbol, ex_dividend_date=ex_date, amount=entry["amount"]
                    )
                )
        return records

    def fetch_splits(self, symbol: str, start: date, end: date) -> list[RawSplitRecord]:
        result = self._fetch_chart(symbol, start, end)
        splits = result.get("events", {}).get("splits") or {}
        records: list[RawSplitRecord] = []
        for entry in splits.values():
            split_date = datetime.fromtimestamp(entry["date"], tz=UTC).date()
            if start <= split_date <= end:
                numerator = entry["numerator"]
                denominator = entry["denominator"]
                if not denominator:
                    continue
                records.append(
                    RawSplitRecord(
                        symbol=symbol, split_date=split_date, ratio=numerator / denominator
                    )
                )
        return records

    def _fetch_chart(self, symbol: str, start: date, end: date) -> dict[str, Any]:
        """Isolated so tests can patch this single method instead of
        scripting HTTP transport for every test — mirrors
        `YFinanceProvider._fetch_history`'s own isolation rationale."""
        period1 = int(datetime.combine(start, datetime.min.time(), tzinfo=UTC).timestamp())
        # +1 day: Yahoo's own range is inclusive of period2's day only if
        # period2 lands after that day's session close, matching this
        # platform's inclusive-`end`-date convention elsewhere (see
        # YFinanceProvider._fetch_history's identical +1 day extension).
        period2 = int(datetime.combine(end, datetime.min.time(), tzinfo=UTC).timestamp()) + 86400
        params = {
            "period1": period1,
            "period2": period2,
            "interval": "1d",
            "events": "div,splits",
        }

        response = self._get_with_retry(f"/v8/finance/chart/{symbol}", params, symbol)

        if response.status_code == 404:
            raise InvalidSymbolError(symbol, self.name)
        if response.status_code != 200:
            raise UnexpectedProviderResponseError(
                f"Yahoo chart endpoint returned status {response.status_code} for '{symbol}': "
                f"{response.text[:200]}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise UnexpectedProviderResponseError(
                f"Yahoo chart response for '{symbol}' was not valid JSON"
            ) from exc

        chart = payload.get("chart", {})
        error = chart.get("error")
        results = chart.get("result")
        if error or not results:
            raise InvalidSymbolError(symbol, self.name)

        return results[0]

    def _get_with_retry(self, url: str, params: dict[str, Any], symbol: str) -> httpx.Response:
        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES + 1):
            _throttle()
            try:
                response = self._client.get(url, params=params)
            except httpx.TimeoutException as exc:
                raise NetworkTimeoutError(f"Yahoo chart request timed out for '{symbol}'") from exc
            except httpx.ConnectError as exc:
                raise ProviderUnavailableError(
                    f"Yahoo chart endpoint could not be reached for '{symbol}': {exc}"
                ) from exc

            # 429 (rate limited, KI-044's exact failure mode) and 5xx are
            # transient — retried with exponential backoff rather than
            # failing the import on the first hit. Anything else (200, 404,
            # other 4xx) is returned immediately for the caller to interpret.
            if response.status_code == 429 or response.status_code >= 500:
                last_exc = ProviderUnavailableError(
                    f"Yahoo chart endpoint returned {response.status_code} for '{symbol}' "
                    f"(attempt {attempt + 1}/{_MAX_RETRIES + 1})"
                )
                if attempt < _MAX_RETRIES:
                    backoff = _BACKOFF_BASE_SECONDS * (2**attempt)
                    logger.warning(
                        "Yahoo chart request for %s got status %s, retrying in %.1fs "
                        "(attempt %d/%d)",
                        symbol,
                        response.status_code,
                        backoff,
                        attempt + 1,
                        _MAX_RETRIES + 1,
                    )
                    time.sleep(backoff)
                    continue
                raise last_exc

            return response

        # Unreachable in practice (the loop always returns or raises above)
        # — kept as an explicit safety net rather than an implicit fallthrough.
        raise last_exc or ProviderUnavailableError(
            f"Yahoo chart endpoint request for '{symbol}' failed with no response"
        )


def _at(sequence: list, index: int) -> Any:
    return sequence[index] if index < len(sequence) else None
