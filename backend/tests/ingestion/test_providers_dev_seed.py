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
    _ANNUAL_DRIFT,
    _ANNUAL_VOLATILITY,
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
    """PTON is the one deliberate exception in the per-symbol annual-drift
    table — every other symbol's own drift parameter must stay positive,
    not an accidental side effect of a future parameter change. Checked
    against the drift *parameter* itself, not simulated output: a single
    random-walk draw can realize a loss even for a positive-drift symbol
    (volatility dominating a short/unlucky path is a real property of a
    geometric random walk, not a bug) — so asserting on close-price
    ordering directly would be flaky in a way that has nothing to do with
    what this test actually wants to guarantee."""
    for symbol, drift in _ANNUAL_DRIFT.items():
        if symbol == "PTON":
            assert drift < 0, "PTON must be the negative-drift symbol"
        else:
            assert drift > 0, f"{symbol} must have positive drift"


def test_every_fixture_symbol_has_a_positive_volatility_parameter() -> None:
    """A zero or negative volatility would collapse the random walk to a
    pure straight line (or crash the `math.sqrt`/Gaussian-scaling math) —
    every symbol must have a real, positive annualized volatility."""
    for symbol in _FIXTURE_BASE_PRICES:
        assert (
            _ANNUAL_VOLATILITY.get(symbol, 0) > 0
        ), f"{symbol} needs a positive volatility parameter"


def test_btc_usd_has_the_highest_volatility_parameter() -> None:
    """Task 1 (M7 Phase 3D-3): 'BTC-USD very high vol' — checked directly
    against the parameter table, not simulated output, for the same
    single-draw-flakiness reason the drift tests above avoid asserting on
    realized prices."""
    assert _ANNUAL_VOLATILITY["BTC-USD"] == max(_ANNUAL_VOLATILITY.values())


def test_price_path_has_no_short_period_repeating_cycle() -> None:
    """The defect this pass fixes (KI-049): the original formula's
    `wobble = 1.01 if day_index % 10 < 5 else 0.99` produced a close price
    that was one of only two possible multipliers of a slowly-drifting
    base — day-over-day percentage changes repeated on a fixed 10-trading-
    day cycle, visibly periodic on the Growth Chart. A genuine random walk
    has no such small repeating cycle: the day-over-day percentage changes
    over a long series should take on many distinct values, not collapse
    to a handful repeating on a fixed period."""
    provider = DevSeedProvider()
    records = provider.fetch_prices("AAPL", START, END)
    closes = [float(r.close) for r in records]
    pct_changes = [round((b - a) / a, 6) for a, b in zip(closes, closes[1:], strict=False)]
    assert len(set(pct_changes)) > 200, "day-over-day % changes look periodic (too few distinct)"


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


def test_price_path_is_a_deterministic_known_answer() -> None:
    """The random walk is seeded from a fixed, symbol-derived string (never
    wall-clock or an external source), so it must produce byte-identical
    output every run — a known-answer regression guard against an
    accidental change to the seeding/formula (M7 Phase 3D-3, replacing the
    prior periodic-oscillator formula's own known-answer test)."""
    provider = DevSeedProvider()
    records = provider.fetch_prices("AAPL", date(2020, 1, 1), date(2020, 1, 3))
    assert [r.price_date for r in records] == [date(2020, 1, 1), date(2020, 1, 2), date(2020, 1, 3)]
    assert [r.close for r in records] == [Decimal("100.09"), Decimal("100.70"), Decimal("100.96")]


def test_price_path_is_reproducible_across_repeated_calls() -> None:
    """Calling `fetch_prices` twice for the same symbol/range must produce
    byte-identical output — the whole point of a fixed, deterministic seed
    rather than an unseeded `random` call."""
    provider = DevSeedProvider()
    first = provider.fetch_prices("TSLA", START, date(2021, 1, 1))
    second = provider.fetch_prices("TSLA", START, date(2021, 1, 1))
    assert [r.close for r in first] == [r.close for r in second]
