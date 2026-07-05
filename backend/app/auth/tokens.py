"""Access token (stateless JWT) and refresh token (opaque, DB-backed)
issuance/verification. Founder Specification names `JWT_SECRET` as a
required env var (Part 2.8.9, 2.11.8) and "Authentication -> JWT" as the
frontend's auth mechanism (Part 2.15.3), but specifies nothing about token
lifetime, claims, or refresh design — every parameter here traces to an
approved Founder Decision from the M5 design review, not the source spec.

Access tokens are intentionally stateless (never persisted): they carry
`is_admin` as a signed claim, re-verified against the database on every
request anyway (see `app.api.v1.dependencies.get_current_user`) rather than
trusted blindly, so a mid-lifetime privilege change (e.g. an admin
demotion) is reflected within one request, not after a 15-minute delay.

Refresh tokens are opaque random values, never JWTs — only their SHA-256
hash is ever persisted (`app.models.RefreshToken.token_hash`), so a
database read alone can never be replayed as a working credential.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt

from app.auth.exceptions import InvalidAccessTokenError
from app.core.config import get_settings

ACCESS_TOKEN_ALGORITHM = "HS256"
REFRESH_TOKEN_BYTES = 32  # 256 bits of entropy


def create_access_token(user_id: uuid.UUID, is_admin: bool) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "is_admin": is_admin,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "jti": uuid.uuid4().hex,
        "typ": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ACCESS_TOKEN_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises InvalidAccessTokenError for any invalid, expired, or
    malformed token — never a raw `jwt` library exception, matching this
    project's "no unclassified exception crosses a module boundary" rule."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ACCESS_TOKEN_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise InvalidAccessTokenError() from exc

    if payload.get("typ") != "access":
        raise InvalidAccessTokenError()
    return payload


def generate_refresh_token() -> str:
    """Returns the raw token to hand to the client. Never store this value
    directly — only `hash_refresh_token(...)` of it."""
    return secrets.token_urlsafe(REFRESH_TOKEN_BYTES)


def hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    settings = get_settings()
    return datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
