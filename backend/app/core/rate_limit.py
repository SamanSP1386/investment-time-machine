"""Fixed-window rate limiter (Founder Specification Part 2.8.13), Redis-backed
when Redis is configured, in-process otherwise (ADR-047).

Redis is used here deliberately since M4 — it was excluded from the
repository/environment foundation (ADR-004) until a milestone actually
needed caching or rate limiting. Milestone 8 (Deployment) makes it OPTIONAL:
`REDIS_URL` unset (the default, `app.core.config.Settings.redis_url == ""`)
selects `InMemoryRateLimiter` via `get_rate_limiter()` below instead of ever
constructing a Redis client — the Render free-tier deployment omits a Redis
add-on entirely, and a per-request socket-connect-timeout finding that out
the hard way, over and over, is worse than never trying.

Keyed by client IP, not by user, since M4 does not implement authentication
(M5) — per-IP is the standard fallback for rate-limiting anonymous/public
endpoints. `RateLimiter` fails OPEN (allows the request, logs a warning) if
Redis itself is unreachable *despite* being configured (e.g. a transient
outage): a rate-limiter outage must never take down the core simulation
feature, mirroring the Founder Specification's own failure-isolation
philosophy ("AI failure must never block simulation", Part 3.4.4) extended
by analogy to this new, less-proven dependency.
"""

import logging
import threading
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
    """Redis-backed fixed-window counter: `limit` requests per
    `window_seconds`, per key."""

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


class InMemoryRateLimiter:
    """In-process fixed-window counter — same semantics and `.allow(key)`
    interface as `RateLimiter`, used automatically by `get_rate_limiter()`
    when `REDIS_URL` is unset.

    State lives in one shared, class-level dict guarded by a lock (each
    dependency call constructs a fresh `InMemoryRateLimiter`/`RateLimiter`
    instance — see `app.api.v1.dependencies` — so the counters themselves
    must outlive any single instance, exactly as Redis does for the
    Redis-backed sibling). Single-process, single-instance only: it does not
    share state across multiple Render/uvicorn worker processes or replicas,
    and resets on restart. That is an accepted, documented tradeoff of a
    free-tier, no-Redis, single-instance deployment (docs/DEPLOYMENT.md) —
    correct behavior for that topology, not a bug.
    """

    _store: dict[str, tuple[int, int]] = {}
    _lock = threading.Lock()

    def __init__(self, limit: int, window_seconds: int = 60) -> None:
        self._limit = limit
        self._window_seconds = window_seconds

    def allow(self, key: str) -> bool:
        window = int(time.time() // self._window_seconds)
        store_key = f"ratelimit:{key}"
        with self._lock:
            self._prune(window)
            stored_window, count = self._store.get(store_key, (window, 0))
            count = count + 1 if stored_window == window else 1
            self._store[store_key] = (window, count)
            return count <= self._limit

    @classmethod
    def _prune(cls, current_window: int) -> None:
        """Drops entries from a prior window so the shared dict stays
        bounded by "distinct keys active in the last ~2 windows" rather than
        growing unboundedly over a long-running process's lifetime."""
        stale_keys = [k for k, (window, _count) in cls._store.items() if window < current_window]
        for stale_key in stale_keys:
            del cls._store[stale_key]


def get_rate_limiter(limit: int, window_seconds: int = 60) -> RateLimiter | InMemoryRateLimiter:
    """Factory used by every rate-limit call site (`app.api.v1.dependencies`)
    instead of constructing `RateLimiter`/`InMemoryRateLimiter` directly —
    the one place that decides Redis vs. in-process, based on whether
    `REDIS_URL` is configured."""
    settings = get_settings()
    if settings.redis_url:
        return RateLimiter(get_redis_client(), limit=limit, window_seconds=window_seconds)
    return InMemoryRateLimiter(limit=limit, window_seconds=window_seconds)
