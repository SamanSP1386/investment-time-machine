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

import math
import random
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

# M7 Phase 3D-3 (founder review round 2, item 1): replaces the original
# `_DAILY_DRIFT` linear-plus-square-wave formula (`price = (base + day_index
# * drift) * (1.01 or 0.99, alternating every 5 trading days)`), which
# produced a visibly periodic saw-tooth/oscillator curve — values genuinely
# repeated to the cent on a fixed 10-trading-day cycle, and a founder
# reviewing a real chart correctly called the result "useless." Replaced
# with a proper geometric random walk with drift: each symbol gets an
# annualized drift (expected return) and volatility, converted to daily
# terms and applied as `price *= 1 + daily_drift + daily_vol * z` once per
# trading day, `z` a standard-normal draw. This is the standard toy model
# for a synthetic-but-plausible price path (geometric Brownian motion) — it
# has no periodicity by construction and never repeats a value exactly.
#
# Values are illustrative fixture choices, not calibrated to any real
# security: AAPL (steady, moderate-vol grower), SPY (broad-market
# baseline), BTC-USD (very high vol, high expected return — crypto's real
# character), KO (modest drift, low vol — the dividend payer), PTON (the
# one deliberately negative-drift "loss" symbol), TSLA (high drift AND high
# vol — the volatile grower), QQQ (growth-tilted ETF, moderate-high vol).
_ANNUAL_DRIFT: dict[str, Decimal] = {
    "AAPL": Decimal("0.18"),
    "SPY": Decimal("0.10"),
    "BTC-USD": Decimal("0.35"),
    "KO": Decimal("0.06"),
    "PTON": Decimal("-0.30"),
    "TSLA": Decimal("0.20"),
    "QQQ": Decimal("0.14"),
}
_ANNUAL_VOLATILITY: dict[str, Decimal] = {
    "AAPL": Decimal("0.25"),
    "SPY": Decimal("0.16"),
    "BTC-USD": Decimal("0.75"),
    "KO": Decimal("0.15"),
    "PTON": Decimal("0.55"),
    "TSLA": Decimal("0.55"),
    "QQQ": Decimal("0.20"),
}
_TRADING_DAYS_PER_YEAR = 252

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
        annual_drift = float(_ANNUAL_DRIFT.get(symbol, Decimal("0.10")))
        annual_volatility = float(_ANNUAL_VOLATILITY.get(symbol, Decimal("0.20")))
        daily_drift = annual_drift / _TRADING_DAYS_PER_YEAR
        daily_volatility = annual_volatility / math.sqrt(_TRADING_DAYS_PER_YEAR)

        # A fixed, symbol-derived seed (not `start`/`end`-derived) — the
        # walk is deterministic and reproducible run-to-run, and two calls
        # sharing a `start` date but different `end` dates produce identical
        # overlapping prices (the same property the prior linear+day_index
        # formula had), since `random.Random(str)`'s seeding algorithm is
        # itself fixed/documented, not subject to PYTHONHASHSEED.
        rng = random.Random(f"dev_seed_random_walk:{symbol}")
        price = float(base_price)

        records: list[RawPriceRecord] = []
        current = start
        while current <= end:
            # Weekdays only, matching how real equity/ETF data has no
            # weekend rows — and the random walk itself only steps on a
            # trading day (no draw consumed for a skipped weekend), so
            # `daily_drift`/`daily_volatility`'s /252 scaling is exact.
            if current.weekday() < 5:
                z = rng.gauss(0.0, 1.0)
                price = max(float(_MIN_CLOSE), price * (1 + daily_drift + daily_volatility * z))
                close = Decimal(str(round(price, 2)))
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
