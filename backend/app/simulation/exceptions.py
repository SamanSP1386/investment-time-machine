"""Explicit Simulation Engine error taxonomy, per Founder Specification
Part 2.14.14 (Error Handling): Asset Not Found, Missing Price Data, Invalid
Date Range, Calculation Failure. No layer in this package catches a bare
`Exception` and repackages it as a generic failure — every controlled error
the engine can produce has its own named type here.
"""

from datetime import date


class SimulationError(Exception):
    """Base for every controlled error the Simulation Engine can raise."""


class AssetNotFoundError(SimulationError):
    """Founder Specification: "Asset Not Found — Invalid symbol"."""

    def __init__(self, symbol: str) -> None:
        self.symbol = symbol
        super().__init__(f"Asset not found: '{symbol}'")


class InvalidDateRangeError(SimulationError):
    """Founder Specification 3.3.2: "Invalid Dates — Validation error"
    (end date must be strictly after start date)."""


class InvalidInvestmentAmountError(SimulationError):
    """Founder Specification 3.3.2: "Invalid Investment Amount — Validation
    error" (must be greater than zero)."""


class MissingHistoricalDataError(SimulationError):
    """Founder Specification: "Missing Price Data — Incomplete dataset",
    referred to as "Missing Historical Data" in the M3 requirements. Raised
    whenever an exact price row required by the calculation (start date, end
    date, or a dividend ex-date during reinvestment) does not exist. Never
    fabricated, interpolated, or substituted with a nearby date."""

    def __init__(self, symbol: str, missing_date: date) -> None:
        self.symbol = symbol
        self.missing_date = missing_date
        super().__init__(f"Missing historical price data for '{symbol}' on {missing_date}")


class CalculationError(SimulationError):
    """Founder Specification: "Calculation Failure — Internal processing
    issue". Raised only for a genuine internal invariant violation (e.g. a
    zero-year CAGR divisor that input validation should have already
    prevented) — this represents a bug, not an expected user-facing
    condition, and should be rare in practice."""
