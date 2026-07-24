"""Direct unit tests for Founder Decision 015 (Option D): the anonymous/
authenticated rate-limit split and the new daily cap on
`app.api.v1.dependencies.rate_limit_ai`. Called as a plain Python function
(not through FastAPI's DI), mirroring `tests/api/test_dependencies.py`'s
existing pattern for exercising dependency logic directly without an HTTP
round trip.

`get_rate_limiter` is monkeypatched to always construct a fresh
`InMemoryRateLimiter` regardless of local `REDIS_URL` configuration — this
suite tests `rate_limit_ai`'s own branching (anonymous vs. authenticated,
which window was exceeded, which key was used), not the underlying limiter
backend's mechanics, which `tests/core/test_rate_limit.py` already covers
directly for both backends. HTTP-level enforcement (a real 429 with the
correct, window-specific JSON message) is covered separately in
`tests/api/test_explanations.py`, matching
`test_simulations.py::test_rate_limit_exceeded_returns_429`'s established
dependency-override pattern.

Every test uses a fresh, unique IP/user id (`_unique_ip`, `uuid.uuid4()`) —
`InMemoryRateLimiter`'s counters live in a shared, class-level dict for the
whole test session, so reusing a key across tests would cause cross-test
interference, the same discipline `tests/core/test_rate_limit.py` already
follows.
"""

import uuid

import pytest

from app.api.v1.dependencies import rate_limit_ai
from app.api.v1.errors import RateLimitExceededError
from app.core.config import Settings
from app.core.rate_limit import InMemoryRateLimiter


class _FakeClient:
    def __init__(self, host: str) -> None:
        self.host = host


class _FakeRequest:
    def __init__(self, host: str) -> None:
        self.client = _FakeClient(host)


class _FakeUser:
    def __init__(self, user_id: uuid.UUID) -> None:
        self.id = user_id


def _settings(**overrides) -> Settings:
    defaults = {
        "jwt_secret": "test-secret",
        "environment": "test",
        "rate_limit_ai_per_minute": 20,
        "rate_limit_ai_anonymous_per_minute": 5,
        "rate_limit_ai_authenticated_per_day": 150,
        "rate_limit_ai_anonymous_per_day": 15,
    }
    defaults.update(overrides)
    return Settings(**defaults)


def _unique_ip() -> str:
    return f"203.0.113.{uuid.uuid4().int % 250}"


@pytest.fixture(autouse=True)
def _in_memory_limiter(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.dependencies.get_rate_limiter",
        lambda limit, window_seconds=60: InMemoryRateLimiter(
            limit=limit, window_seconds=window_seconds
        ),
    )


def _patch_settings(monkeypatch, **overrides) -> None:
    monkeypatch.setattr("app.api.v1.dependencies.get_settings", lambda: _settings(**overrides))


def test_anonymous_caller_allowed_under_both_limits(monkeypatch):
    _patch_settings(
        monkeypatch, rate_limit_ai_anonymous_per_minute=5, rate_limit_ai_anonymous_per_day=15
    )

    rate_limit_ai(_FakeRequest(_unique_ip()), user=None)  # does not raise


def test_anonymous_caller_blocked_at_per_minute_limit(monkeypatch):
    _patch_settings(
        monkeypatch, rate_limit_ai_anonymous_per_minute=2, rate_limit_ai_anonymous_per_day=1000
    )
    request = _FakeRequest(_unique_ip())

    rate_limit_ai(request, user=None)
    rate_limit_ai(request, user=None)
    with pytest.raises(RateLimitExceededError) as exc_info:
        rate_limit_ai(request, user=None)

    assert exc_info.value.window == "minute"


def test_anonymous_caller_blocked_at_daily_cap_with_generous_minute_limit(monkeypatch):
    _patch_settings(
        monkeypatch, rate_limit_ai_anonymous_per_minute=1000, rate_limit_ai_anonymous_per_day=2
    )
    request = _FakeRequest(_unique_ip())

    rate_limit_ai(request, user=None)
    rate_limit_ai(request, user=None)
    with pytest.raises(RateLimitExceededError) as exc_info:
        rate_limit_ai(request, user=None)

    assert exc_info.value.window == "day"


def test_authenticated_caller_keeps_the_spec_mandated_per_minute_limit(monkeypatch):
    _patch_settings(
        monkeypatch, rate_limit_ai_per_minute=3, rate_limit_ai_authenticated_per_day=1000
    )
    user = _FakeUser(uuid.uuid4())
    request = _FakeRequest(_unique_ip())

    rate_limit_ai(request, user=user)
    rate_limit_ai(request, user=user)
    rate_limit_ai(request, user=user)
    with pytest.raises(RateLimitExceededError) as exc_info:
        rate_limit_ai(request, user=user)

    assert exc_info.value.window == "minute"


def test_authenticated_caller_blocked_at_the_higher_daily_cap(monkeypatch):
    _patch_settings(
        monkeypatch, rate_limit_ai_per_minute=1000, rate_limit_ai_authenticated_per_day=2
    )
    user = _FakeUser(uuid.uuid4())
    request = _FakeRequest(_unique_ip())

    rate_limit_ai(request, user=user)
    rate_limit_ai(request, user=user)
    with pytest.raises(RateLimitExceededError) as exc_info:
        rate_limit_ai(request, user=user)

    assert exc_info.value.window == "day"


def test_authenticated_users_are_keyed_independently_by_user_id_not_ip(monkeypatch):
    _patch_settings(
        monkeypatch, rate_limit_ai_per_minute=1, rate_limit_ai_authenticated_per_day=1000
    )
    shared_ip = _unique_ip()
    user_a = _FakeUser(uuid.uuid4())
    user_b = _FakeUser(uuid.uuid4())

    rate_limit_ai(_FakeRequest(shared_ip), user=user_a)  # consumes only user_a's 1/min
    rate_limit_ai(_FakeRequest(shared_ip), user=user_b)  # independent counter despite sharing an IP


def test_anonymous_ips_are_keyed_independently(monkeypatch):
    _patch_settings(
        monkeypatch, rate_limit_ai_anonymous_per_minute=1, rate_limit_ai_anonymous_per_day=1000
    )

    rate_limit_ai(_FakeRequest(_unique_ip()), user=None)
    rate_limit_ai(_FakeRequest(_unique_ip()), user=None)  # a different IP, independent counter


def test_anonymous_and_authenticated_buckets_never_share_a_counter(monkeypatch):
    """A caller who authenticates never inherits the anonymous tier's
    already-consumed counter, even from the same IP — authenticated callers
    are keyed by user id, not IP, so the two tiers are always independent."""
    _patch_settings(
        monkeypatch,
        rate_limit_ai_anonymous_per_minute=1,
        rate_limit_ai_anonymous_per_day=1000,
        rate_limit_ai_per_minute=1,
        rate_limit_ai_authenticated_per_day=1000,
    )
    shared_ip = _unique_ip()
    user = _FakeUser(uuid.uuid4())

    rate_limit_ai(_FakeRequest(shared_ip), user=None)  # exhausts the anonymous IP bucket
    rate_limit_ai(_FakeRequest(shared_ip), user=user)  # does not raise: a different key entirely
