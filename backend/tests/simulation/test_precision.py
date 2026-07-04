from decimal import ROUND_HALF_EVEN, Decimal

from app.simulation.precision import (
    SIMULATION_PRECISION,
    quantize_currency,
    quantize_percentage,
    simulation_decimal_context,
)


def test_simulation_precision_is_at_least_38_digits() -> None:
    assert SIMULATION_PRECISION >= 38


def test_simulation_decimal_context_sets_expected_precision_and_rounding() -> None:
    with simulation_decimal_context() as ctx:
        assert ctx.prec == SIMULATION_PRECISION
        assert ctx.rounding == ROUND_HALF_EVEN


def test_simulation_decimal_context_does_not_leak_globally() -> None:
    import decimal

    default_prec = decimal.getcontext().prec
    with simulation_decimal_context():
        pass
    assert decimal.getcontext().prec == default_prec


def test_quantize_currency_rounds_to_eight_decimal_places() -> None:
    result = quantize_currency(Decimal("100.123456789"))
    assert result == Decimal("100.12345679")  # ordinary rounding, not a midpoint case


def test_quantize_percentage_rounds_to_six_decimal_places() -> None:
    result = quantize_percentage(Decimal("9.5968712345"))
    assert result == Decimal("9.596871")


def test_quantize_currency_uses_banker_s_rounding_at_exact_midpoint() -> None:
    # 100.000000005 is exactly halfway between ...004 and ...005 at 8dp;
    # ROUND_HALF_EVEN rounds to the nearest even final digit (4 is even).
    result = quantize_currency(Decimal("100.000000045"))
    assert result == Decimal("100.00000004")
