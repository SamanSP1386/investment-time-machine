"""Provider Layer adapter for a small, deterministic, clearly-synthetic local
development dataset. This is never a real market-data source and must never
be reachable in production — it exists solely to unblock manual frontend
testing when a real provider (yfinance, CoinGecko) is unavailable, without
touching those adapters or weakening validation: records from this provider
flow through the exact same normalization/validation/repository pipeline
every real provider's records do (see providers/base.py, orchestrator.py).

Guardrails against ever being mistaken for real data:
- `name = "dev_seed"` is stamped directly onto `assets.data_source` — the
  same column real providers populate — never disguised as "yfinance" or
  "coingecko".
- Refuses to run (raises at construction) outside
  `ENVIRONMENT in {"development", "test", "testing"}`, mirroring
  `app.core.config.Settings`'s own JWT_SECRET/AI_PROVIDER production guards.
- Serves only a small, fixed set of symbols at deliberately round, obviously
  synthetic price levels (e.g. AAPL at $100.00) — never an attempt to
  approximate real historical prices, which would risk someone mistaking a
  fabricated number for a real one out of context.

M7 Phase 3D-1 (Craft & Coherence, task F) extends the original three-symbol
fixture (AAPL/SPY/BTC-USD, price-only) with four more symbols specifically
chosen to cover simulation scenarios the frontend had no fixture data to
exercise: a dividend payer (KO), an asset with an overall loss (PTON, the
one deliberately negative-drift symbol), an asset with a disclosed stock
split (TSLA), and an ETF (QQQ). `fetch_dividends`/`fetch_splits` are new
capability methods — implementing them makes this provider satisfy the
`DividendProvider`/`SplitProvider` protocols (`providers/base.py`), which
`orchestrator.import_asset`'s `isinstance` capability check already knows
how to use; this provider previously implemented `PriceProvider` only.
"""

from datetime import date, timedelta
from decimal import Decimal

from app.core.config import get_settings
from app.ingestion.exceptions import InvalidSymbolError
from app.ingestion.providers.base import RawDividendRecord, RawPriceRecord, RawSplitRecord

_NON_PRODUCTION_ENVIRONMENTS = {"development", "test", "testing"}

# Deliberately round, obviously-synthetic base prices — never a real
# historical price for any of these symbols, so nobody could mistake this
# for real market data even seen out of context (e.g. in a screenshot).
_FIXTURE_BASE_PRICES: dict[str, Decimal] = {
    "AAPL": Decimal("100.00"),
    "SPY": Decimal("400.00"),
    "BTC-USD": Decimal("20000.00"),
    "KO": Decimal("60.00"),
    "PTON": Decimal("150.00"),
    "TSLA": Decimal("250.00"),
    "QQQ": Decimal("350.00"),
}

# Per-symbol daily linear drift, added to base_price once per calendar day
# elapsed (including weekends — matching the original formula's day_index
# semantics exactly, unchanged for AAPL/SPY/BTC-USD so nothing that already
# depends on their existing fixture values shifts). PTON is the one
# deliberately negative-drift symbol added this pass, giving the frontend a
# real overall-loss simulation to test against, rather than only ever
# fabricating a gain.
_DAILY_DRIFT: dict[str, Decimal] = {
    "AAPL": Decimal("0.05"),
    "SPY": Decimal("0.05"),
    "BTC-USD": Decimal("0.05"),
    "KO": Decimal("0.02"),
    "PTON": Decimal("-0.06"),
    "TSLA": Decimal("0.08"),
    "QQQ": Decimal("0.06"),
}

# A negative-drift symbol over a long enough date range would otherwise cross
# zero — clamped to a round, obviously-synthetic floor instead, never a
# negative or zero price.
_MIN_CLOSE = Decimal("1.00")

# Symbols this fixture also pays a (fabricated, round, deliberately
# non-realistic) quarterly dividend for — currently just KO, the one
# dividend-payer symbol task F asks for.
_DIVIDEND_PAYERS: dict[str, Decimal] = {
    "KO": Decimal("0.46"),
}

# One disclosed split event per symbol, at a fixed date. Metadata only —
# the price series itself needs no discontinuity at the split date, since
# Founder Decision 001's model already treats a single continuous fetch's
# close_price as retroactively split-adjusted; this fixture's own
# unconditionally-continuous drift formula already matches that shape by
# construction.
_SPLIT_EVENTS: dict[str, tuple[date, Decimal]] = {
    "TSLA": (date(2022, 6, 1), Decimal("3")),
}


class DevSeedProvider:
    """A local-development-only fixture provider. See module docstring."""

    name = "dev_seed"

    def __init__(self) -> None:
        environment = get_settings().environment
        if environment not in _NON_PRODUCTION_ENVIRONMENTS:
            raise RuntimeError(
                "DevSeedProvider ('dev_seed') refuses to run outside a development/test "
                f"environment (ENVIRONMENT={environment!r}) — it produces fabricated, "
                "non-market data and must never be reachable in production."
            )

    def fetch_prices(self, symbol: str, start: date, end: date) -> list[RawPriceRecord]:
        base_price = _FIXTURE_BASE_PRICES.get(symbol)
        if base_price is None:
            raise InvalidSymbolError(symbol, self.name)
        daily_drift = _DAILY_DRIFT.get(symbol, Decimal("0.05"))

        records: list[RawPriceRecord] = []
        current = start
        day_index = 0
        while current <= end:
            # Weekdays only, matching how real equity/ETF data has no
            # weekend rows. A small deterministic drift + oscillation (no
            # randomness — every run of this provider produces byte-identical
            # output for the same symbol/date-range) gives a non-degenerate
            # return for CAGR/growth-chart testing, without ever attempting
            # to resemble a real historical price series.
            if current.weekday() < 5:
                drift = Decimal(day_index) * daily_drift
                wobble = Decimal("1.01") if day_index % 10 < 5 else Decimal("0.99")
                close = max(_MIN_CLOSE, (base_price + drift) * wobble)
                open_price = close * Decimal("0.999")
                high = close * Decimal("1.01")
                low = close * Decimal("0.99")
                records.append(
                    RawPriceRecord(
                        symbol=symbol,
                        price_date=current,
                        open=open_price,
                        high=high,
                        low=low,
                        close=close,
                        adjusted_close=close,
                        volume=1_000_000,
                    )
                )
            current += timedelta(days=1)
            day_index += 1

        return records

    def fetch_dividends(self, symbol: str, start: date, end: date) -> list[RawDividendRecord]:
        amount = _DIVIDEND_PAYERS.get(symbol)
        if amount is None:
            return []
        records: list[RawDividendRecord] = []
        # Quarterly, deterministic, obviously-synthetic fixed dates (the
        # 15th of Feb/May/Aug/Nov, shifted back to the preceding Friday
        # whenever the 15th itself falls on a weekend) — a plausible
        # cadence for testing dividend reinvestment without pretending to
        # be any real company's real declared ex-dividend dates. The
        # weekend shift is required, not cosmetic: `fetch_prices` only
        # emits a row for weekdays (matching real equity/ETF data having no
        # weekend rows), and the Simulation Engine requires an exact price
        # row on a dividend's own ex-dividend date to reinvest it — a
        # dividend dated on a weekend would otherwise make every
        # dividend-reinvestment simulation against this symbol fail with
        # MISSING_HISTORICAL_DATA, caught live during M7 Phase 3D-1's own
        # verification pass.
        for year in range(start.year, end.year + 1):
            for month in (2, 5, 8, 11):
                ex_date = date(year, month, 15)
                weekday = ex_date.weekday()
                if weekday >= 5:
                    ex_date -= timedelta(days=weekday - 4)
                if start <= ex_date <= end:
                    records.append(
                        RawDividendRecord(
                            symbol=symbol, ex_dividend_date=ex_date, amount=amount, currency="USD"
                        )
                    )
        return records

    def fetch_splits(self, symbol: str, start: date, end: date) -> list[RawSplitRecord]:
        event = _SPLIT_EVENTS.get(symbol)
        if event is None:
            return []
        split_date, ratio = event
        if start <= split_date <= end:
            return [RawSplitRecord(symbol=symbol, split_date=split_date, ratio=ratio)]
        return []
