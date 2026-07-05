"""Unit tests for the `Settings` startup guard (red-team finding, M5):
refusing to start with the default `JWT_SECRET` placeholder outside a
development/test environment.
"""

import pytest

from app.core.config import Settings


def test_default_jwt_secret_is_accepted_in_development():
    Settings(environment="development")  # must not raise


def test_default_jwt_secret_is_accepted_in_test_environment():
    Settings(environment="test")  # must not raise


def test_default_jwt_secret_is_rejected_in_production():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(environment="production")


def test_default_jwt_secret_is_rejected_in_staging():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(environment="staging")


def test_a_real_jwt_secret_is_accepted_in_production():
    Settings(
        environment="production", jwt_secret="a-real-randomly-generated-secret"
    )  # must not raise
