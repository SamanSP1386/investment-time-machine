"""FastAPI dependencies: DB session and rate limiting.

The DB session dependency deliberately does NOT auto-commit or auto-rollback
on exception — each service function manages its own transaction boundary
explicitly (see `app.api.v1.services.simulation_service`'s module docstring
for why this matters specifically for failed-simulation persistence).
Closing an uncommitted session is always safe (an implicit rollback happens
at the connection level), so no `finally`-block rollback is needed here.
"""

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session

from app.api.v1.errors import RateLimitExceededError
from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.rate_limit import RateLimiter, get_redis_client


def get_db_session() -> Iterator[Session]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def rate_limit_simulation(request: Request) -> None:
    settings = get_settings()
    limiter = RateLimiter(get_redis_client(), limit=settings.rate_limit_simulation_per_minute)
    if not limiter.allow(f"simulation:{_client_key(request)}"):
        raise RateLimitExceededError()


def rate_limit_read(request: Request) -> None:
    settings = get_settings()
    limiter = RateLimiter(get_redis_client(), limit=settings.rate_limit_read_per_minute)
    if not limiter.allow(f"read:{_client_key(request)}"):
        raise RateLimitExceededError()
