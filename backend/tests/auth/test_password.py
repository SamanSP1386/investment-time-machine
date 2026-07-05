"""Pure unit tests — no database required."""

import pytest

from app.auth.exceptions import WeakPasswordError
from app.auth.password import (
    MIN_PASSWORD_LENGTH,
    hash_password,
    validate_password_strength,
    verify_password,
)


def test_hash_and_verify_round_trip():
    hashed = hash_password("correct-horse-battery-staple")
    assert verify_password("correct-horse-battery-staple", hashed) is True


def test_verify_rejects_wrong_password():
    hashed = hash_password("correct-horse-battery-staple")
    assert verify_password("wrong-password", hashed) is False


def test_verify_rejects_none_hash_without_raising():
    """A `None` hash (e.g. an OAuth-only account with no password set) must
    behave as 'not a match,' never as a crash or a false positive."""
    assert verify_password("anything", None) is False


def test_verify_rejects_malformed_hash_without_raising():
    assert verify_password("anything", "not-a-real-argon2-hash") is False


def test_hash_is_never_the_plaintext():
    hashed = hash_password("hunter2")
    assert hashed != "hunter2"
    assert "hunter2" not in hashed


def test_validate_password_strength_accepts_minimum_length():
    validate_password_strength("a" * MIN_PASSWORD_LENGTH)  # must not raise


def test_validate_password_strength_rejects_too_short():
    with pytest.raises(WeakPasswordError):
        validate_password_strength("a" * (MIN_PASSWORD_LENGTH - 1))
