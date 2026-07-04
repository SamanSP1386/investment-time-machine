"""Unit tests for the Redis-backed fixed-window `RateLimiter`
(Founder Specification Part 2.8.13). Uses the real Redis instance (see
docker-compose.yml) with a unique key per test to avoid cross-test
interference; skips gracefully if Redis isn't reachable, matching the
DB-integration test pattern used elsewhere in this project.
"""

import uuid

import pytest
import redis

from app.core.config import get_settings
from app.core.rate_limit import RateLimiter


def _redis_reachable() -> bool:
    try:
        redis.from_url(get_settings().redis_url, socket_connect_timeout=1, socket_timeout=1).ping()
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
