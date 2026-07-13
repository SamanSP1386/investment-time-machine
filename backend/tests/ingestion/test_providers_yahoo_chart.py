"""Provider Layer tests for YahooChartProvider. No live network calls:
`httpx.Client` is constructed with a `MockTransport` so every response is
scripted — mirrors test_providers_coingecko.py's own pattern.

`_AAPL_SPLIT_FIXTURE` is a real (trimmed) response recorded live from
`query2.finance.yahoo.com/v8/finance/chart/AAPL` spanning AAPL's 2020-08-31
4-for-1 split (fetched during this fix's own KI-016/KI-044 verification
work) — used both as an ordinary parsing fixture and as the split-adjustment
invariant regression test (Founder Decision 001 / KI-016), so this
assumption is checked on every test run without depending on the network.
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
from app.ingestion.providers.yahoo_chart_provider import YahooChartProvider

_BASE_URL = "https://query2.finance.yahoo.com"

# Recorded live 2026-07 from query2.finance.yahoo.com/v8/finance/chart/AAPL
# for 2020-08-03..2020-09-01 (period1=1596240000, period2=1599004800),
# events=div,splits. Trimmed to only the fields this provider reads.
_AAPL_SPLIT_FIXTURE = {
    "timestamp": [
        1596461400,
        1596547800,
        1596634200,
        1596720600,
        1596807000,
        1597066200,
        1597152600,
        1597239000,
        1597325400,
        1597411800,
        1597671000,
        1597757400,
        1597843800,
        1597930200,
        1598016600,
        1598275800,
        1598362200,
        1598448600,
        1598535000,
        1598621400,
        1598880600,
        1598967000,
    ],
    "indicators": {
        "quote": [
            {
                "volume": [
                    308151200,
                    173071600,
                    121776800,
                    202428800,
                    198045600,
                    212403600,
                    187902400,
                    165598000,
                    210082000,
                    165565200,
                    119561600,
                    105633600,
                    145538000,
                    126907200,
                    338054800,
                    345937600,
                    211495600,
                    163022400,
                    155552400,
                    187630000,
                    225702700,
                    151948100,
                ],
                "low": [
                    107.89250183105469,
                    108.38749694824219,
                    108.89749908447266,
                    109.79750061035156,
                    110.2925033569336,
                    110.0,
                    109.10749816894531,
                    110.29750061035156,
                    113.92749786376953,
                    113.04499816894531,
                    113.9625015258789,
                    114.00749969482422,
                    115.61000061035156,
                    115.73249816894531,
                    119.25,
                    123.9375,
                    123.05249786376953,
                    125.0824966430664,
                    123.8324966430664,
                    124.57749938964844,
                    126.0,
                    130.52999877929688,
                ],
                "open": [
                    108.19999694824219,
                    109.13249969482422,
                    109.37750244140625,
                    110.40499877929688,
                    113.20500183105469,
                    112.5999984741211,
                    111.97000122070312,
                    110.49749755859375,
                    114.43000030517578,
                    114.83000183105469,
                    116.0625,
                    114.35250091552734,
                    115.98249816894531,
                    115.75,
                    119.26249694824219,
                    128.69749450683594,
                    124.69750213623047,
                    126.18000030517578,
                    127.14250183105469,
                    126.01249694824219,
                    127.58000183105469,
                    132.75999450683594,
                ],
                "close": [
                    108.9375,
                    109.66500091552734,
                    110.0625,
                    113.90249633789062,
                    111.11250305175781,
                    112.72750091552734,
                    109.375,
                    113.01000213623047,
                    115.01000213623047,
                    114.90750122070312,
                    114.60749816894531,
                    115.5625,
                    115.7074966430664,
                    118.2750015258789,
                    124.37000274658203,
                    125.85749816894531,
                    124.82499694824219,
                    126.52249908447266,
                    125.01000213623047,
                    124.80750274658203,
                    129.0399932861328,
                    134.17999267578125,
                ],
                "high": [
                    111.63749694824219,
                    110.79000091552734,
                    110.39250183105469,
                    114.4124984741211,
                    113.67500305175781,
                    113.7750015258789,
                    112.48249816894531,
                    113.2750015258789,
                    116.0425033569336,
                    115.0,
                    116.0875015258789,
                    116.0,
                    117.1624984741211,
                    118.39250183105469,
                    124.86750030517578,
                    128.78500366210938,
                    125.18000030517578,
                    126.99250030517578,
                    127.48500061035156,
                    126.44249725341797,
                    131.0,
                    134.8000030517578,
                ],
            }
        ],
        "adjclose": [
            {
                "adjclose": [
                    105.476318359375,
                    106.18072509765625,
                    106.56558990478516,
                    110.2835693359375,
                    107.77619171142578,
                    109.34271240234375,
                    106.09086608886719,
                    109.61671447753906,
                    111.5566635131836,
                    111.45724487304688,
                    111.16625213623047,
                    112.09258270263672,
                    112.23323822021484,
                    114.7236557006836,
                    120.63562774658203,
                    122.07845306396484,
                    121.07695770263672,
                    122.72350311279297,
                    121.25639343261719,
                    121.0599594116211,
                    125.1654052734375,
                    130.15106201171875,
                ]
            }
        ],
    },
    "events": {
        "dividends": {"1596807000": {"amount": 0.205, "date": 1596807000}},
        "splits": {
            "1598880600": {
                "date": 1598880600,
                "numerator": 4.0,
                "denominator": 1.0,
                "splitRatio": "4:1",
            }
        },
    },
}


@pytest.fixture(autouse=True)
def _no_real_sleep(monkeypatch):
    """Every test in this module stays instant: neither the retry backoff
    nor the inter-request throttle should actually pause under test."""
    monkeypatch.setattr(
        "app.ingestion.providers.yahoo_chart_provider.time.sleep", lambda _seconds: None
    )
    monkeypatch.setattr("app.ingestion.providers.yahoo_chart_provider._last_request_at", 0.0)


def _client_returning(json_body: dict, status_code: int = 200) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json=json_body)

    return httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)


def _client_raising(exc: Exception) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        raise exc

    return httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)


def _chart_body(result: dict) -> dict:
    return {"chart": {"result": [result], "error": None}}


def test_fetch_prices_parses_ohlcv_and_adjusted_close() -> None:
    provider = YahooChartProvider(client=_client_returning(_chart_body(_AAPL_SPLIT_FIXTURE)))

    records = provider.fetch_prices("AAPL", date(2020, 8, 3), date(2020, 9, 1))

    assert len(records) == 22
    first = records[0]
    assert first.price_date == date(2020, 8, 3)
    assert first.close == pytest.approx(108.9375)
    assert first.adjusted_close == pytest.approx(105.476318359375)
    assert first.volume == 308151200


def test_fetch_prices_filters_to_requested_range() -> None:
    provider = YahooChartProvider(client=_client_returning(_chart_body(_AAPL_SPLIT_FIXTURE)))

    records = provider.fetch_prices("AAPL", date(2020, 8, 20), date(2020, 8, 25))

    assert all(date(2020, 8, 20) <= r.price_date <= date(2020, 8, 25) for r in records)
    # Trading days only: Aug 20, 21, 24, 25 (22-23 is a weekend).
    assert len(records) == 4


def test_fetch_prices_skips_rows_with_a_null_field() -> None:
    body = {
        "timestamp": [1596461400, 1596547800],
        "indicators": {
            "quote": [
                {
                    "open": [108.2, None],
                    "high": [111.6, 110.8],
                    "low": [107.9, 108.4],
                    "close": [108.9, 109.7],
                    "volume": [308151200, 173071600],
                }
            ],
            "adjclose": [{"adjclose": [105.5, 106.2]}],
        },
        "events": {},
    }
    provider = YahooChartProvider(client=_client_returning(_chart_body(body)))

    records = provider.fetch_prices("AAPL", date(2020, 8, 3), date(2020, 8, 4))

    assert len(records) == 1
    assert records[0].price_date == date(2020, 8, 3)


def test_fetch_prices_raises_invalid_symbol_when_no_rows_survive() -> None:
    body = {"timestamp": [], "indicators": {"quote": [{}], "adjclose": [{}]}, "events": {}}
    provider = YahooChartProvider(client=_client_returning(_chart_body(body)))

    with pytest.raises(InvalidSymbolError):
        provider.fetch_prices("NOTAREALTICKER", date(2020, 1, 1), date(2020, 1, 2))


def test_fetch_prices_raises_invalid_symbol_on_404() -> None:
    provider = YahooChartProvider(client=_client_returning({}, status_code=404))

    with pytest.raises(InvalidSymbolError):
        provider.fetch_prices("NOTAREALTICKER", date(2020, 1, 1), date(2020, 1, 2))


def test_fetch_prices_raises_invalid_symbol_on_chart_error_payload() -> None:
    body = {
        "chart": {
            "result": None,
            "error": {"code": "Not Found", "description": "No data found, symbol may be delisted"},
        }
    }
    provider = YahooChartProvider(client=_client_returning(body, status_code=200))

    with pytest.raises(InvalidSymbolError):
        provider.fetch_prices("NOTAREALTICKER", date(2020, 1, 1), date(2020, 1, 2))


def test_fetch_prices_raises_unexpected_response_on_invalid_json() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"not json")

    provider = YahooChartProvider(
        client=httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)
    )

    with pytest.raises(UnexpectedProviderResponseError):
        provider.fetch_prices("AAPL", date(2020, 1, 1), date(2020, 1, 2))


def test_fetch_prices_translates_timeout() -> None:
    provider = YahooChartProvider(client=_client_raising(httpx.TimeoutException("boom")))

    with pytest.raises(NetworkTimeoutError):
        provider.fetch_prices("AAPL", date(2020, 1, 1), date(2020, 1, 2))


def test_fetch_prices_translates_connect_error() -> None:
    provider = YahooChartProvider(client=_client_raising(httpx.ConnectError("boom")))

    with pytest.raises(ProviderUnavailableError):
        provider.fetch_prices("AAPL", date(2020, 1, 1), date(2020, 1, 2))


def test_fetch_prices_retries_on_429_then_succeeds() -> None:
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        if calls["count"] < 3:
            return httpx.Response(429, text="Edge: Too Many Requests")
        return httpx.Response(200, json=_chart_body(_AAPL_SPLIT_FIXTURE))

    provider = YahooChartProvider(
        client=httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)
    )

    records = provider.fetch_prices("AAPL", date(2020, 8, 3), date(2020, 9, 1))

    assert calls["count"] == 3
    assert len(records) == 22


def test_fetch_prices_gives_up_after_max_retries_on_persistent_429() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, text="Edge: Too Many Requests")

    provider = YahooChartProvider(
        client=httpx.Client(transport=httpx.MockTransport(handler), base_url=_BASE_URL)
    )

    with pytest.raises(ProviderUnavailableError):
        provider.fetch_prices("AAPL", date(2020, 8, 3), date(2020, 9, 1))


def test_fetch_prices_raises_provider_unavailable_on_5xx() -> None:
    provider = YahooChartProvider(client=_client_returning({}, status_code=503))

    with pytest.raises(ProviderUnavailableError):
        provider.fetch_prices("AAPL", date(2020, 1, 1), date(2020, 1, 2))


def test_fetch_dividends_parses_events() -> None:
    provider = YahooChartProvider(client=_client_returning(_chart_body(_AAPL_SPLIT_FIXTURE)))

    records = provider.fetch_dividends("AAPL", date(2020, 8, 3), date(2020, 9, 1))

    assert len(records) == 1
    assert records[0].ex_dividend_date == date(2020, 8, 7)
    assert records[0].amount == 0.205


def test_fetch_dividends_empty_when_no_events() -> None:
    body = {"timestamp": [], "indicators": {"quote": [{}], "adjclose": [{}]}, "events": {}}
    provider = YahooChartProvider(client=_client_returning(_chart_body(body)))

    assert provider.fetch_dividends("AAPL", date(2020, 1, 1), date(2020, 1, 2)) == []


def test_fetch_splits_parses_events_and_computes_ratio() -> None:
    provider = YahooChartProvider(client=_client_returning(_chart_body(_AAPL_SPLIT_FIXTURE)))

    records = provider.fetch_splits("AAPL", date(2020, 8, 3), date(2020, 9, 1))

    assert len(records) == 1
    assert records[0].split_date == date(2020, 8, 31)
    assert records[0].ratio == 4.0


def test_fetch_splits_empty_when_no_events() -> None:
    body = {"timestamp": [], "indicators": {"quote": [{}], "adjclose": [{}]}, "events": {}}
    provider = YahooChartProvider(client=_client_returning(_chart_body(body)))

    assert provider.fetch_splits("AAPL", date(2020, 1, 1), date(2020, 1, 2)) == []


# --- Split-adjustment invariant (Founder Decision 001 / KI-016 / KI-044) ---


def test_split_adjustment_invariant_close_is_already_split_adjusted() -> None:
    """The empirical assumption underlying Founder Decision 001 and
    `docs/simulation_formulas.md` §3: raw `close_price` from a single fetch
    is already retroactively split-adjusted, so the Simulation Engine must
    never also multiply by `split_ratio`. Verified here against a real,
    recorded AAPL response spanning the 2020-08-31 4-for-1 split — the last
    pre-split close (2020-08-28) must read in the ~$124-126 range (the
    split-adjusted figure), never ~$499 (the nominal, non-adjusted figure
    AAPL actually closed at that day) — matching KI-016's own live
    verification numbers exactly.
    """
    provider = YahooChartProvider(client=_client_returning(_chart_body(_AAPL_SPLIT_FIXTURE)))

    records = provider.fetch_prices("AAPL", date(2020, 8, 3), date(2020, 9, 1))
    by_date = {r.price_date: r for r in records}

    last_pre_split_close = by_date[date(2020, 8, 28)].close
    assert 108 < last_pre_split_close < 127, (
        f"expected a split-adjusted close in the ~$108-126 range, got {last_pre_split_close} "
        "— if this is ~$499, the provider is returning nominal, non-split-adjusted prices and "
        "Founder Decision 001's model would silently double-adjust for this split."
    )
    assert last_pre_split_close == pytest.approx(124.80750274658203)

    splits = provider.fetch_splits("AAPL", date(2020, 8, 3), date(2020, 9, 1))
    assert len(splits) == 1
    assert splits[0].split_date == date(2020, 8, 31)
    assert splits[0].ratio == 4.0
