"""Redis-backed fixed-window rate limiter (Founder Specification Part 2.8.13).

Redis is used here deliberately for the first time in this project — it was
excluded from the repository/environment foundation (ADR-004) until a
milestone actually needed caching or rate limiting; the API Layer is that
milestone.

Keyed by client IP, not by user, since M4 does not implement authentication
(M5) — per-IP is the standard fallback for rate-limiting anonymous/public
endpoints. Fails OPEN (allows the request, logs a warning) if Redis itself is
unreachable: a rate-limiter outage must never take down the core simulation
feature, mirroring the Founder Specification's own failure-isolation
philosophy ("AI failure must never block simulation", Part 3.4.4) extended
by analogy to this new, less-proven dependency.
"""

import logging
import time

import redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(
            get_settings().redis_url, socket_connect_timeout=2, socket_timeout=2
        )
    return _client


class RateLimiter:
    """Fixed-window counter: `limit` requests per `window_seconds`, per key."""

    def __init__(self, client: redis.Redis, limit: int, window_seconds: int = 60) -> None:
        self._client = client
        self._limit = limit
        self._window_seconds = window_seconds

    def allow(self, key: str) -> bool:
        window = int(time.time() // self._window_seconds)
        redis_key = f"ratelimit:{key}:{window}"
        try:
            count = self._client.incr(redis_key)
            if count == 1:
                self._client.expire(redis_key, self._window_seconds)
            return count <= self._limit
        except redis.RedisError as exc:
            logger.warning("rate limiter unavailable, failing open: %s", exc)
            return True
