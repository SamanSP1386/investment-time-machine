"""Unit tests for the `Settings` startup guards: refusing to start with a
development-only placeholder value (`JWT_SECRET`, `DATABASE_URL`,
`CORS_ALLOWED_ORIGINS`) or a relaxed `COOKIE_SECURE` outside a
development/test environment. The `JWT_SECRET` guard is the original M5
red-team finding; the other three were added for Milestone 8 (Deployment,
ADR-047) under the same "fail fast, don't rely on remembering" discipline
(KI-046).
"""

import pytest

from app.core.config import Settings

_REAL_PRODUCTION_KWARGS = {
    "jwt_secret": "a-real-randomly-generated-secret",
    "database_url": "postgresql://real_user:real_password@real-host.example.com:5432/itm_prod",
    "cors_allowed_origins": "https://investment-time-machine.vercel.app",
}


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


def test_default_database_url_is_rejected_in_production():
    kwargs = {k: v for k, v in _REAL_PRODUCTION_KWARGS.items() if k != "database_url"}
    with pytest.raises(ValueError, match="DATABASE_URL"):
        Settings(environment="production", **kwargs)


@pytest.mark.parametrize(
    "local_url",
    [
        # A near-miss placeholder — not byte-identical to the code's own
        # default, but still obviously local. This is the exact shape of
        # value `.github/workflows/ci.yml`'s job-level `DATABASE_URL` env
        # var supplies for its ephemeral test database (same host, different
        # database name) — the regression this test guards against.
        "postgresql://itm_user:itm_password@localhost:5432/itm_test",
        "postgresql://itm_user:itm_password@localhost:5432/itm_staging",
        "postgresql://ci_user:ci_password@127.0.0.1:5432/itm_test",
        "postgresql://user:pass@LOCALHOST:5432/whatever",
        "",
    ],
)
def test_local_or_missing_database_url_is_rejected_in_production_even_when_not_the_exact_default(
    local_url,
):
    """The guard must not be an exact-string match against one literal
    default — pydantic-settings resolves an unset field from a real
    environment variable before falling back to the Python default, so a
    *different* local/placeholder value can (and, in CI, does) reach
    `Settings` unnoticed by a literal `==` check."""
    kwargs = {k: v for k, v in _REAL_PRODUCTION_KWARGS.items() if k != "database_url"}
    with pytest.raises(ValueError, match="DATABASE_URL"):
        Settings(environment="production", database_url=local_url, **kwargs)


def test_default_cors_origins_is_rejected_in_production():
    kwargs = {k: v for k, v in _REAL_PRODUCTION_KWARGS.items() if k != "cors_allowed_origins"}
    with pytest.raises(ValueError, match="CORS_ALLOWED_ORIGINS"):
        Settings(environment="production", **kwargs)


def test_cookie_secure_false_is_rejected_in_production():
    with pytest.raises(ValueError, match="COOKIE_SECURE"):
        Settings(environment="production", cookie_secure=False, **_REAL_PRODUCTION_KWARGS)


def test_a_fully_configured_production_settings_is_accepted():
    Settings(environment="production", **_REAL_PRODUCTION_KWARGS)  # must not raise


def test_cors_allowed_origins_list_splits_and_strips_and_drops_blanks():
    settings = Settings(
        environment="development",
        cors_allowed_origins="http://localhost:3000, http://localhost:3001,,  ",
    )
    assert settings.cors_allowed_origins_list == ["http://localhost:3000", "http://localhost:3001"]
