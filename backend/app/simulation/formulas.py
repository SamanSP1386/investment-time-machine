"""Pure, DB-free financial calculations — the Simulation Engine's sole
source of financial truth (Founder Specification Part 2.14.2). Every
formula here is cited to its exact Founder Specification section in
`docs/simulation_formulas.md`. No function in this module performs I/O,
reads settings, or depends on wall-clock time — given the same Decimal
inputs, every function returns the same Decimal output, always.
"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from app.simulation.exceptions import CalculationError, MissingHistoricalDataError


@dataclass(frozen=True)
class DividendEvent:
    ex_dividend_date: date
    amount_per_share: Decimal


@dataclass(frozen=True)
class PricePoint:
    price_date: date
    close_price: Decimal


@dataclass(frozen=True)
class GrowthSeriesPoint:
    point_date: date
    value: Decimal


def calculate_shares_purchased(investment_amount: Decimal, initial_price: Decimal) -> Decimal:
    """Founder Specification 2.14.7: shares_purchased = investment_amount / initial_price."""
    return investment_amount / initial_price


def calculate_final_value(shares_held: Decimal, final_price: Decimal) -> Decimal:
    """Founder Specification 2.14.7: final_value = shares_purchased × final_price."""
    return shares_held * final_price


def calculate_total_return_percent(final_value: Decimal, investment_amount: Decimal) -> Decimal:
    """Founder Specification 2.14.8 / 3.5.3 (ROI):
    total_return_percent = ((final_value - investment_amount) / investment_amount) × 100."""
    return ((final_value - investment_amount) / investment_amount) * Decimal(100)


def calculate_years_between(start_date: date, end_date: date) -> Decimal:
    """365.25-day-per-year convention — an explicit implementation choice,
    documented in `docs/simulation_formulas.md` §4 (the Founder Specification's
    CAGR formula does not define a day-count convention)."""
    days = Decimal((end_date - start_date).days)
    return days / Decimal("365.25")


def calculate_cagr(final_value: Decimal, investment_amount: Decimal, years: Decimal) -> Decimal:
    """Founder Specification 2.14.9 / 3.5.4:
    CAGR = ((final_value / investment_amount) ^ (1 / years) - 1) × 100.

    Percentage-scaled to match `calculate_total_return_percent`'s convention
    — both populate identically-typed, identically-suffixed `_percentage`
    columns (`app.models.simulation.Simulation`), so they must share a scale.
    Prior to `calculation_version` "v2" (see `docs/simulation_formulas.md`
    §4a, `docs/ARCHITECTURE_DECISIONS.md` ADR-040), this function returned an
    unscaled raw fraction — Founder Decision 016 approved this correction and
    a backfill of every "v1" stored value.

    `years <= 0` should already be rejected by input validation (end_date
    must be strictly after start_date) before this is ever called — raising
    CalculationError here signals an internal invariant violation, not a
    normal user-facing condition.
    """
    if years <= 0:
        raise CalculationError(f"CAGR requires years > 0, got {years}")
    ratio = final_value / investment_amount
    return (ratio ** (Decimal(1) / years) - Decimal(1)) * Decimal(100)


def calculate_inflation_adjusted_value(
    final_value: Decimal, cpi_at_start: Decimal, cpi_at_end: Decimal
) -> Decimal:
    """Founder Specification 2.14.11 / 3.5.10:
    real_value = final_value × (cpi_at_start / cpi_at_end)."""
    return final_value * (cpi_at_start / cpi_at_end)


def apply_dividend_reinvestment(
    initial_shares: Decimal,
    dividend_events: list[DividendEvent],
    price_on_date: Callable[[date], Decimal],
    symbol: str,
) -> Decimal:
    """Founder Specification 2.14.10, "When enabled": retrieve dividend
    events, calculate cash received, purchase additional shares, update
    share count, continue — applied exactly once per event, in chronological
    order. Only called when dividends_reinvested=True; when False, the
    Founder Specification (2.14.10 "When disabled", 3.3.3) is explicit that
    dividend events are ignored entirely, not tracked as uninvested cash —
    so this function is simply never invoked in that case, and the share
    count never changes from `initial_shares`.

    `price_on_date` is injected (not a direct DB call) so this function
    stays pure and independently testable; raises MissingHistoricalDataError
    itself is the caller's responsibility if `price_on_date` cannot resolve
    a date — this function propagates whatever `price_on_date` raises.
    """
    shares_held = initial_shares
    for event in dividend_events:  # caller is responsible for chronological ordering
        cash_dividend = shares_held * event.amount_per_share
        price = price_on_date(event.ex_dividend_date)
        if price is None:
            raise MissingHistoricalDataError(symbol, event.ex_dividend_date)
        shares_held += cash_dividend / price
    return shares_held


def calculate_growth_series(
    initial_shares: Decimal,
    prices: list[PricePoint],
    dividend_events: list[DividendEvent],
    symbol: str,
) -> list[GrowthSeriesPoint]:
    """Founder Specification 3.3.2's required "Growth Chart" output — added
    in M4 (not part of M3's original scope, discovered as a gap during the
    M4 API design review; see docs/KNOWN_ISSUES.md KI-021).

    Replays the same dividend-reinvestment logic as
    `apply_dividend_reinvestment`, but incrementally at every stored price
    date rather than only at the two endpoints, so the caller gets a full
    value-over-time series instead of a single final number. `close_price`
    only (Founder Decision 001) — never `adjusted_close_price` — and
    `dividend_events` must be pre-sorted ascending, exactly as
    `apply_dividend_reinvestment` requires. Pass an empty `dividend_events`
    list when `dividends_reinvested=False`, matching that function's
    contract exactly.

    `prices` must include a row for every date a dividend event lands on
    (guaranteed by the caller: `run_simulation` only reaches this function
    after `apply_dividend_reinvestment` has already succeeded against the
    same data) — `MissingHistoricalDataError` is still raised defensively if
    that invariant is ever violated, rather than silently skipping a point.
    """
    shares_held = initial_shares
    dividend_index = 0
    series: list[GrowthSeriesPoint] = []

    for point in prices:
        while (
            dividend_index < len(dividend_events)
            and dividend_events[dividend_index].ex_dividend_date <= point.price_date
        ):
            event = dividend_events[dividend_index]
            if event.ex_dividend_date != point.price_date:
                raise MissingHistoricalDataError(symbol, event.ex_dividend_date)
            cash_dividend = shares_held * event.amount_per_share
            shares_held += cash_dividend / point.close_price
            dividend_index += 1
        series.append(
            GrowthSeriesPoint(point_date=point.price_date, value=shares_held * point.close_price)
        )

    return series
