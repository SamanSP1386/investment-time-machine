"""Per-account login lockout — Founder Specification 3.6.7's Credential
Stuffing mitigation ("Account lockout policies"), a distinct control from
the generic per-IP `RateLimiter` (`app.core.rate_limit`): lockout tracks
failed attempts *per account* (keyed by normalized email) so an attacker
distributing guesses across many IPs against one account is still stopped,
which IP-based rate limiting alone cannot catch.

Reuses the same Redis instance and the same fixed-window-counter mechanics
as `app.core.rate_limit.RateLimiter` (fail open on Redis unreachability —
consistent with this project's established availability-over-strictness
policy for this class of dependency), but is a separate, purpose-built class
since its semantics (lock after N, stay locked for the rest of the window,
reset on success) differ from a simple per-minute request cap.

`InMemoryAccountLockout` (below) is the in-process fallback used when
`REDIS_URL` is unset (ADR-047), matching `app.core.rate_limit`'s own
Redis-optional design exactly — see `get_account_lockout_backend()`.
"""

import logging
import threading
import time

import redis

logger = logging.getLogger(__name__)


class AccountLockout:
    def __init__(self, client: redis.Redis, max_attempts: int, window_seconds: int) -> None:
        self._client = client
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds

    def _key(self, email: str) -> str:
        return f"login_lockout:{email}"

    def is_locked(self, email: str) -> tuple[bool, int]:
        """Returns (locked, seconds_remaining). Fails open (not locked) if
        Redis is unreachable — an outage of this dependency must never be
        the reason a legitimate user can't log in."""
        try:
            count_raw = self._client.get(self._key(email))
            count = int(count_raw) if count_raw is not None else 0
            if count < self._max_attempts:
                return False, 0
            ttl = self._client.ttl(self._key(email))
            return True, max(ttl, 0)
        except redis.RedisError as exc:
            logger.warning("account lockout check unavailable, failing open: %s", exc)
            return False, 0

    def record_failed_attempt(self, email: str) -> None:
        try:
            key = self._key(email)
            count = self._client.incr(key)
            if count == 1:
                self._client.expire(key, self._window_seconds)
        except redis.RedisError as exc:
            logger.warning("could not record failed login attempt, failing open: %s", exc)

    def reset(self, email: str) -> None:
        try:
            self._client.delete(self._key(email))
        except redis.RedisError as exc:
            logger.warning("could not reset login lockout counter: %s", exc)


class InMemoryAccountLockout:
    """In-process fallback for `AccountLockout` — identical interface
    (`is_locked`/`record_failed_attempt`/`reset`) and identical semantics
    (fixed window from the first failed attempt; lock stays until the
    window expires), backed by one shared, class-level dict guarded by a
    lock instead of Redis.

    Single-process, single-instance only, matching
    `app.core.rate_limit.InMemoryRateLimiter`'s own documented tradeoff — an
    accepted limitation of a free-tier, no-Redis, single-instance
    deployment, not a bug.
    """

    _store: dict[str, tuple[int, float]] = {}
    _lock = threading.Lock()

    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds

    def _key(self, email: str) -> str:
        return f"login_lockout:{email}"

    def is_locked(self, email: str) -> tuple[bool, int]:
        key = self._key(email)
        now = time.time()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return False, 0
            count, expires_at = entry
            if now >= expires_at:
                del self._store[key]
                return False, 0
            if count < self._max_attempts:
                return False, 0
            return True, max(int(expires_at - now), 0)

    def record_failed_attempt(self, email: str) -> None:
        key = self._key(email)
        now = time.time()
        with self._lock:
            entry = self._store.get(key)
            if entry is None or now >= entry[1]:
                self._store[key] = (1, now + self._window_seconds)
            else:
                count, expires_at = entry
                self._store[key] = (count + 1, expires_at)

    def reset(self, email: str) -> None:
        with self._lock:
            self._store.pop(self._key(email), None)


def get_account_lockout_backend(
    max_attempts: int, window_seconds: int
) -> "AccountLockout | InMemoryAccountLockout":
    """Factory mirroring `app.core.rate_limit.get_rate_limiter()`: picks
    Redis- vs. in-process-backed lockout based on whether `REDIS_URL` is
    configured. Imports are local to avoid a module-level cycle
    (`app.core.rate_limit` already imports `app.core.config`)."""
    from app.core.config import get_settings
    from app.core.rate_limit import get_redis_client

    settings = get_settings()
    if settings.redis_url:
        return AccountLockout(
            get_redis_client(), max_attempts=max_attempts, window_seconds=window_seconds
        )
    return InMemoryAccountLockout(max_attempts=max_attempts, window_seconds=window_seconds)
