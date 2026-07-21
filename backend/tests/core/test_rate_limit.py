"""Unit tests for the fixed-window rate limiter (Founder Specification Part
2.8.13): `RateLimiter` (Redis-backed), `InMemoryRateLimiter` (the
Redis-optional fallback, ADR-047), and the `get_rate_limiter()` factory that
picks between them based on `REDIS_URL`.

The Redis-backed tests use the real Redis instance (see docker-compose.yml)
with a unique key per test to avoid cross-test interference; they skip
gracefully if Redis isn't reachable (or `REDIS_URL` isn't set at all — the
project's own default since ADR-047), matching the DB-integration test
pattern used elsewhere in this project.
"""

import uuid

import pytest
import redis

from app.core.config import get_settings
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter, get_rate_limiter


def _redis_reachable() -> bool:
    url = get_settings().redis_url
    if not url:
        return False
    try:
        redis.from_url(url, socket_connect_timeout=1, socket_timeout=1).ping()
        return True
    except redis.RedisError:
        return False


@pytest.fixture
def redis_client():
    if not _redis_reachable():
        pytest.skip("Redis not reachable in this environment — see docs/KNOWN_ISSUES.md")
    return redis.from_url(get_settings().redis_url, socket_connect_timeout=2, socket_timeout=2)


def test_allows_requests_under_the_limit(redis_client):
    limiter = RateLimiter(redis_client, limit=3)
    key = f"test:{uuid.uuid4()}"

    assert limiter.allow(key) is True
    assert limiter.allow(key) is True
    assert limiter.allow(key) is True


def test_blocks_requests_over_the_limit(redis_client):
    limiter = RateLimiter(redis_client, limit=2)
    key = f"test:{uuid.uuid4()}"

    assert limiter.allow(key) is True
    assert limiter.allow(key) is True
    assert limiter.allow(key) is False


def test_distinct_keys_have_independent_counters(redis_client):
    limiter = RateLimiter(redis_client, limit=1)
    key_a = f"test:{uuid.uuid4()}"
    key_b = f"test:{uuid.uuid4()}"

    assert limiter.allow(key_a) is True
    assert limiter.allow(key_b) is True
    assert limiter.allow(key_a) is False
    assert limiter.allow(key_b) is False


def test_fails_open_when_redis_unreachable():
    unreachable_client = redis.from_url(
        "redis://localhost:1/0", socket_connect_timeout=1, socket_timeout=1
    )
    limiter = RateLimiter(unreachable_client, limit=1)

    assert limiter.allow(f"test:{uuid.uuid4()}") is True


class TestInMemoryRateLimiter:
    """The Redis-optional fallback (ADR-047) — same fixed-window semantics
    as `RateLimiter`, but backed by an in-process, class-level dict instead
    of Redis. No skip/reachability guard needed: this backend has no
    external dependency at all."""

    def test_allows_requests_under_the_limit(self):
        limiter = InMemoryRateLimiter(limit=3)
        key = f"test:{uuid.uuid4()}"

        assert limiter.allow(key) is True
        assert limiter.allow(key) is True
        assert limiter.allow(key) is True

    def test_blocks_requests_over_the_limit(self):
        limiter = InMemoryRateLimiter(limit=2)
        key = f"test:{uuid.uuid4()}"

        assert limiter.allow(key) is True
        assert limiter.allow(key) is True
        assert limiter.allow(key) is False

    def test_distinct_keys_have_independent_counters(self):
        limiter = InMemoryRateLimiter(limit=1)
        key_a = f"test:{uuid.uuid4()}"
        key_b = f"test:{uuid.uuid4()}"

        assert limiter.allow(key_a) is True
        assert limiter.allow(key_b) is True
        assert limiter.allow(key_a) is False
        assert limiter.allow(key_b) is False

    def test_state_persists_across_separate_instances(self):
        """Mirrors `dependencies.py`'s real usage: a fresh limiter instance
        is constructed on every request, so the counter must live at the
        class level, not the instance level."""
        key = f"test:{uuid.uuid4()}"

        assert InMemoryRateLimiter(limit=1).allow(key) is True
        assert InMemoryRateLimiter(limit=1).allow(key) is False


class TestGetRateLimiter:
    """`get_rate_limiter()` — the single factory every call site uses — must
    select the backend based on `REDIS_URL`, without requiring a live Redis
    instance to test the "unset" branch (the project's own default)."""

    def test_returns_in_memory_limiter_when_redis_url_is_unset(self, monkeypatch):
        monkeypatch.setenv("REDIS_URL", "")
        get_settings.cache_clear()
        try:
            limiter = get_rate_limiter(limit=5)
            assert isinstance(limiter, InMemoryRateLimiter)
        finally:
            get_settings.cache_clear()

    def test_returns_redis_limiter_when_redis_url_is_set(self, monkeypatch):
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
        get_settings.cache_clear()
        try:
            limiter = get_rate_limiter(limit=5)
            assert isinstance(limiter, RateLimiter)
        finally:
            get_settings.cache_clear()
