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
"""

from datetime import date, timedelta
from decimal import Decimal

from app.core.config import get_settings
from app.ingestion.exceptions import InvalidSymbolError
from app.ingestion.providers.base import RawPriceRecord

_NON_PRODUCTION_ENVIRONMENTS = {"development", "test", "testing"}

# Deliberately round, obviously-synthetic base prices — never a real
# historical AAPL/SPY/BTC-USD price, so nobody could mistake this for real
# market data even seen out of context (e.g. in a screenshot).
_FIXTURE_BASE_PRICES: dict[str, Decimal] = {
    "AAPL": Decimal("100.00"),
    "SPY": Decimal("400.00"),
    "BTC-USD": Decimal("20000.00"),
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
                drift = Decimal(day_index) * Decimal("0.05")
                wobble = Decimal("1.01") if day_index % 10 < 5 else Decimal("0.99")
                close = (base_price + drift) * wobble
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
