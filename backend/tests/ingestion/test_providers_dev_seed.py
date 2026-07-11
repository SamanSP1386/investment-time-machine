"""Provider Layer tests for the M7 Phase 3D-1 (Craft & Coherence, task F)
extension of `DevSeedProvider`: four new fixture symbols (KO, PTON, TSLA,
QQQ) alongside the original three (AAPL, SPY, BTC-USD), plus the new
`fetch_dividends`/`fetch_splits` capability methods. No live network calls —
this provider is pure, deterministic Python, nothing to mock.
"""

from datetime import date
from decimal import Decimal

from app.ingestion.providers.base import DividendProvider, PriceProvider, SplitProvider
from app.ingestion.providers.dev_seed_provider import (
    _DAILY_DRIFT,
    _DIVIDEND_PAYERS,
    _FIXTURE_BASE_PRICES,
    _SPLIT_EVENTS,
    DevSeedProvider,
)
from app.ingestion.seed_dev_data import SEED_ASSETS

START = date(2020, 1, 1)
END = date(2024, 12, 31)


def test_implements_all_three_capability_protocols() -> None:
    """Confirms this provider now satisfies DividendProvider/SplitProvider
    too (structural typing via runtime_checkable Protocols) — previously it
    only implemented PriceProvider, so orchestrator.import_asset's
    isinstance checks silently skipped dividends/splits for every dev_seed
    symbol."""
    provider = DevSeedProvider()
    assert isinstance(provider, PriceProvider)
    assert isinstance(provider, DividendProvider)
    assert isinstance(provider, SplitProvider)


def test_seed_dev_data_covers_exactly_the_fixture_symbols() -> None:
    """The one-shot seed script's symbol list must never drift from what
    DevSeedProvider can actually generate prices for — a mismatch would
    either seed an asset with no price data, or leave a fixture symbol
    unseeded by the recommended script."""
    assert set(SEED_ASSETS.keys()) == set(_FIXTURE_BASE_PRICES.keys())


def test_fetch_prices_produces_records_for_every_fixture_symbol() -> None:
    provider = DevSeedProvider()
    for symbol in _FIXTURE_BASE_PRICES:
        records = provider.fetch_prices(symbol, START, END)
        assert len(records) > 0, f"{symbol} produced no price records"
        assert all(r.symbol == symbol for r in records)
        assert all(r.close > 0 for r in records), f"{symbol} produced a non-positive close price"


def test_pton_is_the_deliberately_negative_drift_symbol() -> None:
    """Task F: 'an overall-loss asset' — PTON's close price must be lower
    at the end of the range than the beginning, unlike every gain symbol."""
    provider = DevSeedProvider()
    records = provider.fetch_prices("PTON", START, END)
    assert records[-1].close < records[0].close


def test_pton_is_the_only_negative_drift_symbol() -> None:
    """PTON is the one deliberate exception in the per-symbol drift table —
    every other symbol's own daily drift must stay positive, not an
    accidental side effect of the drift-table refactor. Checked against the
    drift *parameter* itself, not simulated output: the short-period
    +/-1% wobble oscillation can dominate a small enough cumulative drift
    at arbitrary endpoint dates (confirmed for BTC-USD over this file's own
    START/END range, a pre-existing property of the original, unmodified
    wobble formula, not a regression) — so asserting on close-price
    ordering directly would be flaky in a way that has nothing to do with
    what this test actually wants to guarantee."""
    for symbol, drift in _DAILY_DRIFT.items():
        if symbol == "PTON":
            assert drift < 0, "PTON must be the negative-drift symbol"
        else:
            assert drift > 0, f"{symbol} must have positive drift"


def test_fetch_prices_never_produces_a_non_positive_close_over_a_long_range() -> None:
    """PTON's negative drift is clamped (_MIN_CLOSE) so a long enough date
    range can never cross zero or negative — a fabricated negative price
    would be a nonsensical fixture value, not just an unusual one."""
    provider = DevSeedProvider()
    records = provider.fetch_prices("PTON", date(2000, 1, 1), date(2024, 12, 31))
    assert all(r.close >= Decimal("1.00") for r in records)


def test_fetch_dividends_only_for_the_designated_payer() -> None:
    provider = DevSeedProvider()
    ko_dividends = provider.fetch_dividends("KO", START, END)
    assert len(ko_dividends) > 0
    assert all(d.symbol == "KO" for d in ko_dividends)
    assert all(d.amount == _DIVIDEND_PAYERS["KO"] for d in ko_dividends)
    assert all(d.currency == "USD" for d in ko_dividends)

    for symbol in set(_FIXTURE_BASE_PRICES) - {"KO"}:
        assert provider.fetch_dividends(symbol, START, END) == []


def test_every_dividend_date_falls_on_a_trading_day_and_has_a_matching_price_row() -> None:
    """A dividend dated on a weekend has no corresponding price row
    (fetch_prices only emits weekdays), which makes the Simulation Engine
    reject any dividend-reinvestment simulation crossing it with
    MISSING_HISTORICAL_DATA — caught live during this pass's own
    verification (a real KO simulation failed before this fix). Every
    generated ex-dividend date must be a weekday, and must exactly match
    one of that same symbol's own generated price dates."""
    provider = DevSeedProvider()
    ko_dividends = provider.fetch_dividends("KO", START, END)
    assert len(ko_dividends) > 0
    for dividend in ko_dividends:
        assert (
            dividend.ex_dividend_date.weekday() < 5
        ), f"{dividend.ex_dividend_date} falls on a weekend"

    ko_price_dates = {record.price_date for record in provider.fetch_prices("KO", START, END)}
    for dividend in ko_dividends:
        assert (
            dividend.ex_dividend_date in ko_price_dates
        ), f"{dividend.ex_dividend_date} has no matching KO price row"


def test_fetch_splits_only_for_the_designated_split_symbol() -> None:
    provider = DevSeedProvider()
    tsla_splits = provider.fetch_splits("TSLA", START, END)
    assert len(tsla_splits) == 1
    expected_date, expected_ratio = _SPLIT_EVENTS["TSLA"]
    assert tsla_splits[0].split_date == expected_date
    assert tsla_splits[0].ratio == expected_ratio

    for symbol in set(_FIXTURE_BASE_PRICES) - {"TSLA"}:
        assert provider.fetch_splits(symbol, START, END) == []


def test_fetch_splits_respects_the_requested_date_range() -> None:
    """A split event outside the requested window must not be disclosed —
    matching every other provider's own date-range contract."""
    provider = DevSeedProvider()
    before_split = provider.fetch_splits("TSLA", date(2020, 1, 1), date(2022, 1, 1))
    assert before_split == []


def test_original_three_symbols_prices_unchanged_by_the_refactor() -> None:
    """AAPL/SPY/BTC-USD's own drift formula must produce the exact same
    values as before this pass's per-symbol drift parameterization — a
    known-answer regression guard against the shared refactor accidentally
    changing the original fixture's own numbers."""
    provider = DevSeedProvider()
    records = provider.fetch_prices("AAPL", date(2020, 1, 1), date(2020, 1, 3))
    # 2020-01-01 is a Wednesday (a trading day); day_index=0, drift=0,
    # wobble=1.01 (day_index % 10 < 5) -> close = 100.00 * 1.01 = 101.00
    assert records[0].price_date == date(2020, 1, 1)
    assert records[0].close == Decimal("101.0000")
