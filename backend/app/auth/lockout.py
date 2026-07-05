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
"""

import logging

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
