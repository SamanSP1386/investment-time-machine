"""Provider Layer contracts. Responsible only for communication with an
external data source — no validation, no database access, no business logic
(see .claude/SYSTEM.md service boundaries, extended here to the ingestion
sub-layers). A provider adapter returns raw, provider-shaped data; everything
downstream treats that data as untrusted until the Validation Layer clears it.

Capabilities are split into separate protocols (PriceProvider,
DividendProvider, SplitProvider, IndicatorProvider) rather than one big
interface, because not every provider supports every capability — crypto has
no dividends or splits, FRED has neither prices nor corporate actions. The
orchestrator checks capability via isinstance() before calling, so adding a
future provider that only supports a subset requires no change to providers
that already exist.
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class RawPriceRecord:
    """Provider-native OHLCV record. Field types are intentionally loose
    (Decimal | float | str) because different providers hand back different
    native types (yfinance: numpy/pandas floats; JSON APIs: strings or
    floats) — normalization is responsible for coercing these, not the
    provider."""

    symbol: str
    price_date: date
    open: Decimal | float | str
    high: Decimal | float | str
    low: Decimal | float | str
    close: Decimal | float | str
    adjusted_close: Decimal | float | str
    volume: int | float | str


@dataclass(frozen=True)
class RawDividendRecord:
    symbol: str
    ex_dividend_date: date
    amount: Decimal | float | str
    currency: str = "USD"


@dataclass(frozen=True)
class RawSplitRecord:
    symbol: str
    split_date: date
    ratio: Decimal | float | str


@dataclass(frozen=True)
class RawIndicatorObservation:
    indicator_code: str
    observation_date: date
    value: Decimal | float | str | None
    """None represents the provider's own "no observation this period"
    marker (e.g. FRED's "."), distinct from zero — validation rejects it
    rather than the provider silently coercing it to 0."""


@runtime_checkable
class PriceProvider(Protocol):
    name: str  # matches the data_source column value, e.g. "yfinance"

    def fetch_prices(self, symbol: str, start: date, end: date) -> list[RawPriceRecord]: ...


@runtime_checkable
class DividendProvider(Protocol):
    name: str

    def fetch_dividends(self, symbol: str, start: date, end: date) -> list[RawDividendRecord]: ...


@runtime_checkable
class SplitProvider(Protocol):
    name: str

    def fetch_splits(self, symbol: str, start: date, end: date) -> list[RawSplitRecord]: ...


@runtime_checkable
class IndicatorProvider(Protocol):
    name: str

    def fetch_observations(
        self, indicator_code: str, start: date, end: date
    ) -> list[RawIndicatorObservation]: ...
