"""Decimal precision and rounding policy for the Simulation Engine, per
`docs/simulation_formulas.md` §4: a scoped, high-precision context for
intermediate arithmetic, and a single, explicit, final rounding step when a
value is about to be stored (never mid-calculation, and never left to
whatever the default Decimal context or Postgres happens to do implicitly).
"""

import decimal
from collections.abc import Iterator
from contextlib import contextmanager

# Well above the `decimal` module's default of 28 significant digits, so
# repeated division across many dividend-reinvestment events over long
# holding periods can't silently lose precision.
SIMULATION_PRECISION = 38

# Banker's rounding — the `decimal` module's own default rounding mode,
# chosen to avoid the systematic upward bias `ROUND_HALF_UP` introduces
# across many independent rounding operations.
ROUNDING_MODE = decimal.ROUND_HALF_EVEN

# Matches historical_prices/simulations NUMERIC(20,8) currency columns.
CURRENCY_QUANTUM = decimal.Decimal("0.00000001")

# Matches simulations NUMERIC(10,6) percentage columns.
PERCENTAGE_QUANTUM = decimal.Decimal("0.000001")


@contextmanager
def simulation_decimal_context() -> Iterator[decimal.Context]:
    """Scoped precision/rounding context for a single simulation's
    calculations. Never mutates the global Decimal context — callers outside
    this block are unaffected."""
    with decimal.localcontext() as ctx:
        ctx.prec = SIMULATION_PRECISION
        ctx.rounding = ROUNDING_MODE
        yield ctx


def quantize_currency(value: decimal.Decimal) -> decimal.Decimal:
    """Round to the NUMERIC(20,8) scale used by every currency/share-count
    column this engine writes to."""
    return value.quantize(CURRENCY_QUANTUM, rounding=ROUNDING_MODE)


def quantize_percentage(value: decimal.Decimal) -> decimal.Decimal:
    """Round to the NUMERIC(10,6) scale used by percentage columns."""
    return value.quantize(PERCENTAGE_QUANTUM, rounding=ROUNDING_MODE)
