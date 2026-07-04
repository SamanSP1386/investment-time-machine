"""API-layer service for simulation creation/retrieval. Thin: all financial
calculation stays in `app.simulation.engine`/`formulas` — this module only
translates between the external API contract (Founder Specification
vocabulary: `include_dividends`, `adjust_for_inflation`) and the internal
engine parameters (`dividends_reinvested`, `inflation_adjusted` — see
docs/KNOWN_ISSUES.md KI-024), manages the transaction boundary, and records
one audit-log entry per attempt (KI-026 — see `app.api.v1.audit`).

Transaction boundary note: `app.simulation.engine.run_simulation` only
`flush()`es — it never commits (by design, established in M3: the caller
owns the transaction). This service is that caller, and the commit point
matters: for `MissingHistoricalDataError`/`CalculationError`, the engine has
already flushed a failed `Simulation` row before re-raising, and that row
must be explicitly committed here before the exception is allowed to
propagate — otherwise a later rollback (e.g. from FastAPI's dependency
cleanup) would silently discard the exact audit record Founder Specification
Part 2.6.24 requires being stored. The audit-log write for that same failure
happens only after that commit, in its own follow-up commit, so a problem
recording the audit entry (isolated via a SAVEPOINT, see
`app.api.v1.audit.record_simulation_audit`) can never risk the already-
durable `Simulation` row.
"""

import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.api.v1.audit import record_simulation_audit
from app.api.v1.errors import ForbiddenError, SimulationNotFoundError
from app.api.v1.schemas.simulations import SimulationCreateRequest
from app.models import Simulation
from app.simulation.engine import SimulationOutcome, run_simulation
from app.simulation.exceptions import (
    AssetNotFoundError,
    CalculationError,
    InvalidDateRangeError,
    InvalidInvestmentAmountError,
    MissingHistoricalDataError,
)

_PRE_FLIGHT_ERROR_CODES = {
    AssetNotFoundError: "ASSET_NOT_FOUND",
    InvalidDateRangeError: "INVALID_DATE_RANGE",
    InvalidInvestmentAmountError: "INVALID_INVESTMENT_AMOUNT",
}

_MID_SIMULATION_ERROR_CODES = {
    MissingHistoricalDataError: "MISSING_HISTORICAL_DATA",
    CalculationError: "CALCULATION_ERROR",
}


def create_simulation(
    session: Session,
    request: SimulationCreateRequest,
    *,
    request_id: str,
    user_id: uuid.UUID | None = None,
) -> tuple[SimulationOutcome, str]:
    """Returns (outcome, normalized_asset_symbol). Raises whatever
    `run_simulation` raises, after ensuring the transaction is left in the
    correct state for that specific error type (see module docstring), and
    after recording exactly one audit-log entry for the attempt."""
    symbol = request.asset_symbol.strip().upper()

    try:
        outcome = run_simulation(
            session,
            symbol=symbol,
            investment_amount=Decimal(request.investment_amount),
            start_date=request.start_date,
            end_date=request.end_date,
            dividends_reinvested=request.include_dividends,
            inflation_adjusted=request.adjust_for_inflation,
            user_id=user_id,
        )
        session.commit()
        record_simulation_audit(
            session,
            status="succeeded",
            request_id=request_id,
            asset_symbol=symbol,
            simulation_id=outcome.simulation.id,
            user_id=user_id,
        )
        session.commit()
        return outcome, symbol
    except (AssetNotFoundError, InvalidDateRangeError, InvalidInvestmentAmountError) as exc:
        session.rollback()  # nothing was written for these pre-flight errors
        record_simulation_audit(
            session,
            status="failed",
            request_id=request_id,
            asset_symbol=symbol,
            simulation_id=None,
            error_code=_PRE_FLIGHT_ERROR_CODES[type(exc)],
            user_id=user_id,
        )
        session.commit()
        raise
    except (MissingHistoricalDataError, CalculationError) as exc:
        # The engine already flushed a failed Simulation row before
        # re-raising — commit it so it durably survives, per Founder
        # Specification Part 2.6.24's "failed simulations should be stored."
        session.commit()
        record_simulation_audit(
            session,
            status="failed",
            request_id=request_id,
            asset_symbol=symbol,
            simulation_id=exc.simulation_id,
            error_code=_MID_SIMULATION_ERROR_CODES[type(exc)],
            user_id=user_id,
        )
        session.commit()
        raise


def get_simulation_by_id(
    session: Session,
    simulation_id: uuid.UUID,
    requesting_user_id: uuid.UUID | None = None,
) -> Simulation:
    simulation = session.get(Simulation, simulation_id)
    if simulation is None:
        raise SimulationNotFoundError(simulation_id)

    if simulation.user_id is not None and simulation.user_id != requesting_user_id:
        raise ForbiddenError()

    return simulation
