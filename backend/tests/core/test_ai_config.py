"""Tests for the M6 `Settings` startup guard (mirrors the existing
`JWT_SECRET` guard, ADR-020 precedent): a real AI provider configured
without an API key must fail loudly at startup, not silently degrade.
Provider is Groq as of Founder Decision 019 (M7 Phase 4, ADR-049) — the
guard's shape is otherwise unchanged from the original Anthropic version.

Unlike the JWT_SECRET guard, this one applies in every environment,
including development/test — there is no "convenient insecure default" to
carve out here, since the actual default ("none") is always safe. The only
way to trigger this guard at all is to deliberately opt into a real
provider, at which point a missing key is a real misconfiguration
regardless of environment.
"""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_ai_provider_defaults_to_none_and_requires_no_key():
    settings = Settings(jwt_secret="test-secret", environment="test")
    assert settings.ai_provider == "none"


def test_groq_provider_with_api_key_is_valid():
    settings = Settings(
        jwt_secret="test-secret",
        environment="test",
        ai_provider="groq",
        groq_api_key="gsk-fake-key",
    )
    assert settings.ai_provider == "groq"


def test_groq_provider_without_api_key_raises():
    with pytest.raises(ValidationError):
        Settings(
            jwt_secret="test-secret",
            environment="test",
            ai_provider="groq",
            groq_api_key="",
        )


def test_unknown_provider_value_raises():
    with pytest.raises(ValidationError):
        Settings(jwt_secret="test-secret", environment="test", ai_provider="anthropic")
