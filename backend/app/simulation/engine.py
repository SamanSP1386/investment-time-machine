"""Simulation Engine orchestration: Input Validation -> Historical Data
Retrieval -> Simulation Calculation -> Result Generation -> Storage, per
Founder Specification Part 2.14.4. The sole entry point is `run_simulation`.

Error contract: `run_simulation` either returns a `SimulationOutcome` (the
simulation succeeded) or raises a `SimulationError` subclass — never both,
never a bare `Exception`. Two error types are pre-flight validation failures
(`AssetNotFoundError`, `InvalidDateRangeError`, `InvalidInvestmentAmountError`)
and never produce a persisted `Simulation` row: there is no valid `asset_id`
to store against when the asset itself doesn't exist, and the Founder
Specification's own error table classifies these as "Validation error", not
"Simulation blocked" (Part 3.3.2). The other two (`MissingHistoricalDataError`,
`CalculationError`) occur once a valid asset is known, and per Founder
Specification Part 2.6.24 ("Failed simulations should be stored... especially
when missing data... prevent calculation"), a failed `Simulation` row IS
persisted (status=failed, error_message set) before the exception is
re-raised to the caller.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import Simulation, StockSplit
from app.models.enums import SimulationStatus
from app.simulation.exceptions import (
    AssetNotFoundError,
    CalculationError,
    InvalidDateRangeError,
    InvalidInvestmentAmountError,
    MissingHistoricalDataError,
)
from app.simulation.formulas import (
    DividendEvent,
    GrowthSeriesPoint,
    PricePoint,
    apply_dividend_reinvestment,
    calculate_cagr,
    calculate_final_value,
    calculate_growth_series,
    calculate_inflation_adjusted_value,
    calculate_shares_purchased,
    calculate_total_return_percent,
    calculate_years_between,
)
from app.simulation.precision import (
    quantize_currency,
    quantize_percentage,
    simulation_decimal_context,
)
from app.simulation.repository import SimulationRepository

logger = logging.getLogger(__name__)

DEFAULT_CPI_INDICATOR_CODE = "CPIAUCSL"
DEFAULT_CALCULATION_VERSION = "v1"


@dataclass(frozen=True)
class SimulationOutcome:
    """What `run_simulation` returns on success: the persisted `Simulation`
    row, plus any stock splits disclosed for audit/transparency (Founder
    Decision 001), plus the value-over-time `growth_series` (Founder
    Specification Part 3.3.2's required "Growth Chart" output, added in M4 —
    see docs/KNOWN_ISSUES.md KI-021). Neither is persisted to the
    `simulations` table (no columns exist for them) — both are computed
    fresh from already-stored data and surfaced only to the caller."""

    simulation: Simulation
    disclosed_splits: tuple[StockSplit, ...] = ()
    growth_series: tuple[GrowthSeriesPoint, ...] = ()


def _validate_inputs(investment_amount: Decimal, start_date: date, end_date: date) -> None:
    if investment_amount <= 0:
        raise InvalidInvestmentAmountError(
            f"investment_amount must be greater than zero, got {investment_amount}"
        )
    if end_date <= start_date:
        raise InvalidDateRangeError(
            f"end_date ({end_date}) must be strictly after start_date ({start_date})"
        )


def run_simulation(
    session: Session,
    *,
    symbol: str,
    investment_amount: Decimal,
    start_date: date,
    end_date: date,
    dividends_reinvested: bool = False,
    inflation_adjusted: bool = False,
    user_id: uuid.UUID | None = None,
    cpi_indicator_code: str = DEFAULT_CPI_INDICATOR_CODE,
    calculation_version: str = DEFAULT_CALCULATION_VERSION,
) -> SimulationOutcome:
    repo = SimulationRepository(session)
    symbol = symbol.strip().upper()

    _validate_inputs(investment_amount, start_date, end_date)

    asset = repo.get_asset_by_symbol(symbol)
    if asset is None:
        raise AssetNotFoundError(symbol)

    try:
        with simulation_decimal_context():
            initial_price_row = repo.get_price_on_date(asset.id, start_date)
            if initial_price_row is None:
                raise MissingHistoricalDataError(symbol, start_date)

            final_price_row = repo.get_price_on_date(asset.id, end_date)
            if final_price_row is None:
                raise MissingHistoricalDataError(symbol, end_date)

            initial_price = initial_price_row.close_price
            final_price = final_price_row.close_price

            # close_price only — never adjusted_close_price (Founder Decision 001).
            shares_held = calculate_shares_purchased(investment_amount, initial_price)

            events: list[DividendEvent] = []
            if dividends_reinvested:
                dividend_rows = repo.get_dividends_ordered(asset.id, start_date, end_date)
                events = [
                    DividendEvent(
                        ex_dividend_date=row.ex_dividend_date,
                        amount_per_share=row.dividend_amount,
                    )
                    for row in dividend_rows
                ]

                def _price_lookup(target_date: date) -> Decimal | None:
                    row = repo.get_price_on_date(asset.id, target_date)
                    return row.close_price if row is not None else None

                shares_held = apply_dividend_reinvestment(
                    shares_held, events, _price_lookup, symbol
                )
            # When dividends_reinvested is False, dividend events are never
            # retrieved or applied at all (Founder Specification 2.14.10/
            # 3.3.3: "ignore dividend events, use price appreciation only")
            # — not tracked as uninvested cash, simply not looked at.
            # `events` stays [] in that case, which `calculate_growth_series`
            # (below) treats identically to `apply_dividend_reinvestment`.

            final_value = calculate_final_value(shares_held, final_price)
            total_return_percentage = calculate_total_return_percent(final_value, investment_amount)
            years = calculate_years_between(start_date, end_date)
            cagr = calculate_cagr(final_value, investment_amount, years)

            inflation_adjusted_final_value = None
            if inflation_adjusted:
                cpi_start_row = repo.get_latest_cpi_on_or_before(cpi_indicator_code, start_date)
                cpi_end_row = repo.get_latest_cpi_on_or_before(cpi_indicator_code, end_date)
                if cpi_start_row is not None and cpi_end_row is not None:
                    inflation_adjusted_final_value = calculate_inflation_adjusted_value(
                        final_value, cpi_start_row.value, cpi_end_row.value
                    )
                # else: left None -- "inflation adjustment unavailable"
                # (Founder Specification 3.3.4), a soft degradation, not a
                # failed simulation.

            # Audit/disclosure only (Founder Decision 001) -- never read above.
            splits = repo.get_splits_ordered(asset.id, start_date, end_date)

            # Growth Chart (Founder Specification 3.3.2) -- a read-only
            # replay of the same dividend logic above, at every stored price
            # date rather than only the two endpoints. Never persisted (no
            # `simulations` column exists for it); surfaced via
            # SimulationOutcome only. See docs/KNOWN_ISSUES.md KI-021.
            price_rows = repo.get_prices_ordered(asset.id, start_date, end_date)
            price_points = [
                PricePoint(price_date=row.price_date, close_price=row.close_price)
                for row in price_rows
            ]
            growth_series = calculate_growth_series(
                calculate_shares_purchased(investment_amount, initial_price),
                price_points,
                events,
                symbol,
            )

            simulation = Simulation(
                user_id=user_id,
                asset_id=asset.id,
                initial_investment_amount=investment_amount,
                start_date=start_date,
                end_date=end_date,
                dividends_reinvested=dividends_reinvested,
                inflation_adjusted=inflation_adjusted,
                initial_price=quantize_currency(initial_price),
                final_price=quantize_currency(final_price),
                shares_purchased=quantize_currency(shares_held),
                final_value=quantize_currency(final_value),
                total_return_percentage=quantize_percentage(total_return_percentage),
                cagr_percentage=quantize_percentage(cagr),
                inflation_adjusted_final_value=(
                    quantize_currency(inflation_adjusted_final_value)
                    if inflation_adjusted_final_value is not None
                    else None
                ),
                status=SimulationStatus.COMPLETED,
                calculation_version=calculation_version,
            )
            session.add(simulation)
            session.flush()

        logger.info(
            "simulation completed: symbol=%s start=%s end=%s final_value=%s",
            symbol,
            start_date,
            end_date,
            simulation.final_value,
        )
        return SimulationOutcome(
            simulation=simulation,
            disclosed_splits=tuple(splits),
            growth_series=tuple(growth_series),
        )

    except (MissingHistoricalDataError, CalculationError) as exc:
        failed_simulation = Simulation(
            user_id=user_id,
            asset_id=asset.id,
            initial_investment_amount=investment_amount,
            start_date=start_date,
            end_date=end_date,
            dividends_reinvested=dividends_reinvested,
            inflation_adjusted=inflation_adjusted,
            status=SimulationStatus.FAILED,
            calculation_version=calculation_version,
            error_message=str(exc),
        )
        session.add(failed_simulation)
        session.flush()
        exc.simulation_id = failed_simulation.id
        logger.warning("simulation failed: symbol=%s error=%s", symbol, exc)
        raise
