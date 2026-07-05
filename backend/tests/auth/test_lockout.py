"""Unit tests for `AccountLockout` (Founder Specification 3.6.7's "Account
lockout policies" mitigation). Uses the real Redis instance (see
docker-compose.yml), same pattern as tests/core/test_rate_limit.py — a
unique key (email) per test avoids cross-test interference; skips
gracefully if Redis isn't reachable.
"""

import uuid

import pytest
import redis

from app.auth.lockout import AccountLockout
from app.core.config import get_settings


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


def _email() -> str:
    return f"lockout-test-{uuid.uuid4()}@example.com"


def test_not_locked_before_max_attempts(redis_client):
    lockout = AccountLockout(redis_client, max_attempts=3, window_seconds=60)
    email = _email()

    lockout.record_failed_attempt(email)
    lockout.record_failed_attempt(email)

    locked, _ = lockout.is_locked(email)
    assert locked is False


def test_locked_after_max_attempts(redis_client):
    lockout = AccountLockout(redis_client, max_attempts=3, window_seconds=60)
    email = _email()

    lockout.record_failed_attempt(email)
    lockout.record_failed_attempt(email)
    lockout.record_failed_attempt(email)

    locked, retry_after = lockout.is_locked(email)
    assert locked is True
    assert retry_after > 0


def test_reset_clears_the_lock(redis_client):
    lockout = AccountLockout(redis_client, max_attempts=1, window_seconds=60)
    email = _email()

    lockout.record_failed_attempt(email)
    assert lockout.is_locked(email)[0] is True

    lockout.reset(email)
    assert lockout.is_locked(email)[0] is False


def test_distinct_emails_have_independent_counters(redis_client):
    lockout = AccountLockout(redis_client, max_attempts=1, window_seconds=60)
    email_a, email_b = _email(), _email()

    lockout.record_failed_attempt(email_a)

    assert lockout.is_locked(email_a)[0] is True
    assert lockout.is_locked(email_b)[0] is False


def test_fails_open_when_redis_unreachable():
    unreachable_client = redis.from_url(
        "redis://localhost:1/0", socket_connect_timeout=1, socket_timeout=1
    )
    lockout = AccountLockout(unreachable_client, max_attempts=1, window_seconds=60)
    email = _email()

    lockout.record_failed_attempt(email)  # must not raise
    locked, _ = lockout.is_locked(email)
    assert locked is False
