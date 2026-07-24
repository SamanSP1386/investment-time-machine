"""FastAPI dependencies: DB session, rate limiting, and authentication.

The DB session dependency deliberately does NOT auto-commit or auto-rollback
on exception — each service function manages its own transaction boundary
explicitly (see `app.api.v1.services.simulation_service`'s module docstring
for why this matters specifically for failed-simulation persistence).
Closing an uncommitted session is always safe (an implicit rollback happens
at the connection level), so no `finally`-block rollback is needed here.

Authentication middleware (`get_current_user_optional` /
`get_current_user_required` / `get_current_admin_user`) reads the access
token from its httpOnly cookie (never an `Authorization` header — see
`app.api.v1.routers.auth`'s cookie-strategy docstring) and re-loads the user
from the database on every request rather than trusting the token's
`is_admin` claim blindly: the claim is signed and cannot be forged, but a
mid-session privilege change (an admin demotion, an account suspension)
must take effect within one request, not after the access token's full
15-minute lifetime — a `Depends(get_db_session)` round-trip already happens
on every request anyway, so this costs nothing extra in practice.
"""

import uuid
from collections.abc import Iterator

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.api.v1.errors import ForbiddenError, RateLimitExceededError, UnauthorizedError
from app.auth.exceptions import InvalidAccessTokenError
from app.auth.tokens import decode_access_token
from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.rate_limit import get_rate_limiter
from app.models import User


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
    limiter = get_rate_limiter(limit=settings.rate_limit_simulation_per_minute)
    if not limiter.allow(f"simulation:{_client_key(request)}"):
        raise RateLimitExceededError()


def rate_limit_read(request: Request) -> None:
    settings = get_settings()
    limiter = get_rate_limiter(limit=settings.rate_limit_read_per_minute)
    if not limiter.allow(f"read:{_client_key(request)}"):
        raise RateLimitExceededError()


def rate_limit_auth(request: Request) -> None:
    settings = get_settings()
    limiter = get_rate_limiter(limit=settings.rate_limit_auth_per_minute)
    if not limiter.allow(f"auth:{_client_key(request)}"):
        raise RateLimitExceededError()


def get_current_user_optional(
    request: Request, session: Session = Depends(get_db_session)
) -> User | None:
    """Returns `None` for any reason a caller isn't a valid, active,
    authenticated user (no cookie, malformed/expired token, deleted/
    suspended account) — deliberately uniform, matching the same
    "don't leak why" discipline as `app.auth.exceptions.InvalidCredentialsError`.
    Used by endpoints that behave differently for anonymous vs. authenticated
    callers (e.g. attaching `user_id` to a simulation opportunistically)
    without *requiring* authentication."""
    token = request.cookies.get("access_token")
    if token is None:
        return None
    try:
        payload = decode_access_token(token)
    except InvalidAccessTokenError:
        return None

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        return None

    user = session.get(User, user_id)
    if user is None or not user.is_active:
        return None
    return user


def rate_limit_ai(request: Request, user: User | None = Depends(get_current_user_optional)) -> None:
    """Founder Decision 015 (Option D): anonymous callers get a lower
    per-minute rate plus a new daily cap; authenticated callers keep the
    Founder Specification's explicit 20/min (Part 2.8.13, unchanged) plus a
    materially higher daily cap. `get_current_user_optional` is re-declared
    here as a dependency (not called directly) so FastAPI's per-request
    dependency cache — not a second DB round trip — supplies `user`; every
    route already resolves it once for its own handler, and `use_cache=True`
    is the default.

    Authenticated callers are keyed by user id (a real, stable identifier
    now exists); anonymous callers are keyed by IP, matching the existing
    general pattern (M6 design review §13) since no other anonymous
    identifier exists (Founder Decision 015's own text). Both the
    per-minute and the daily window are checked on every call — either one
    exceeded blocks the request, with `RateLimitExceededError.window`
    telling the exception handler which happened, so a daily-cap message
    never gets a per-minute "try again shortly" reply."""
    settings = get_settings()
    if user is not None:
        scope_key = f"user:{user.id}"
        minute_limit = settings.rate_limit_ai_per_minute
        day_limit = settings.rate_limit_ai_authenticated_per_day
    else:
        scope_key = f"ip:{_client_key(request)}"
        minute_limit = settings.rate_limit_ai_anonymous_per_minute
        day_limit = settings.rate_limit_ai_anonymous_per_day

    minute_limiter = get_rate_limiter(limit=minute_limit)
    if not minute_limiter.allow(f"ai:minute:{scope_key}"):
        raise RateLimitExceededError(window="minute")

    day_limiter = get_rate_limiter(limit=day_limit, window_seconds=86400)
    if not day_limiter.allow(f"ai:day:{scope_key}"):
        raise RateLimitExceededError(window="day")


def get_current_user_required(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """Founder Specification 2.15.6 / 3.3.10: Simulation History (and any
    future route requiring a real account) uses this dependency."""
    if user is None:
        raise UnauthorizedError()
    return user


def get_current_admin_user(user: User = Depends(get_current_user_required)) -> User:
    """Founder Specification 2.8.6: Administrator-only actions. Not yet
    attached to any route (Admin Import remains deferred — KI-023) but
    available now so that future milestone needs no new middleware."""
    if not user.is_admin:
        raise ForbiddenError()
    return user
