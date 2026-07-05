"""Identity Management orchestration: Register -> Authenticate -> Issue
Session -> Refresh -> Logout. Mirrors `app.simulation.engine`'s role as the
sole entry point for its domain's business logic — pure with respect to
transport concerns (no cookies, no HTTP, no audit logging here; see
`app.api.v1.services.auth_service` for that layer).

Error contract: every function here either returns its documented success
value or raises an `app.auth.exceptions.AuthError` subclass — never a bare
`Exception`, matching the discipline already established in
`app.simulation.engine`.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.auth.exceptions import (
    AccountInactiveError,
    AccountLockedError,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    RefreshTokenReuseDetectedError,
)
from app.auth.lockout import AccountLockout
from app.auth.password import hash_password, validate_password_strength, verify_password
from app.auth.repository import AuthRepository
from app.auth.tokens import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    refresh_token_expiry,
)
from app.models import RefreshToken, User


@dataclass(frozen=True)
class IssuedSession:
    """A freshly issued (or refreshed) session. `refresh_token` is the raw
    value — the only place it ever exists outside the client's cookie; the
    database only ever stores its hash."""

    user: User
    access_token: str
    refresh_token: str


def register_user(session: Session, *, email: str, password: str, display_name: str) -> User:
    repo = AuthRepository(session)
    normalized_email = email.strip().lower()

    validate_password_strength(password)

    if repo.get_user_by_email(normalized_email) is not None:
        raise EmailAlreadyRegisteredError(normalized_email)

    return repo.create_user(
        email=normalized_email,
        password_hash=hash_password(password),
        display_name=display_name.strip(),
    )


def authenticate(
    session: Session,
    *,
    email: str,
    password: str,
    lockout: AccountLockout,
    user_agent: str | None,
    ip_address: str | None,
) -> IssuedSession:
    """Founder Specification 3.3.9 (User Authentication) + 3.6.7 (Credential
    Stuffing). Order matters for security, not just correctness:
    1. Lockout is checked *before* any password verification is attempted —
       a locked-out account never gets another guess scored, successful or not.
    2. Password is verified *before* `is_active` is checked, so a wrong
       password against a suspended account still yields the generic
       `InvalidCredentialsError` — only a caller who already proved they
       know the correct password ever learns the account is suspended.
    """
    repo = AuthRepository(session)
    normalized_email = email.strip().lower()

    locked, retry_after = lockout.is_locked(normalized_email)
    if locked:
        raise AccountLockedError(retry_after)

    user = repo.get_user_by_email(normalized_email)
    # verify_password runs even when user is None (against a fixed dummy
    # hash) to keep this branch's timing indistinguishable from the
    # "user exists, wrong password" branch — see app.auth.password.
    password_hash = user.password_hash if user is not None else None
    if not verify_password(password, password_hash) or user is None:
        lockout.record_failed_attempt(normalized_email)
        raise InvalidCredentialsError()

    if not user.is_active:
        raise AccountInactiveError()

    lockout.reset(normalized_email)
    issued, _ = _issue_session(session, user, user_agent=user_agent, ip_address=ip_address)
    return issued


def refresh_session(
    session: Session,
    *,
    raw_refresh_token: str,
    user_agent: str | None,
    ip_address: str | None,
) -> IssuedSession:
    """Rotation with reuse detection (approved Founder Decision "Refresh
    Token Rotation"): every successful refresh revokes the presented token
    and issues a brand new one, chained via `replaced_by_id`. Presenting a
    token that has already been rotated away is treated as a theft signal —
    every active token for that user is revoked as a precaution, forcing a
    fresh login on every device."""
    repo = AuthRepository(session)
    token_hash = hash_refresh_token(raw_refresh_token)
    token = repo.get_refresh_token_by_hash(token_hash)

    if token is None:
        raise InvalidRefreshTokenError()

    if token.revoked_at is not None:
        repo.revoke_all_for_user(token.user_id)
        raise RefreshTokenReuseDetectedError()

    if token.expires_at <= datetime.now(UTC):
        raise InvalidRefreshTokenError()

    user = repo.get_user_by_id(token.user_id)
    if user is None or not user.is_active:
        raise AccountInactiveError()

    new_session, new_token_row = _issue_session(
        session, user, user_agent=user_agent, ip_address=ip_address
    )
    repo.revoke_refresh_token(token, replaced_by_id=new_token_row.id)
    return new_session


def logout(session: Session, *, raw_refresh_token: str) -> uuid.UUID | None:
    """Best-effort and idempotent: an already-invalid, already-revoked, or
    unrecognized token is silently a no-op rather than an error — a logout
    endpoint must never become an oracle for "is this token currently
    valid?" (the same reasoning that keeps login/refresh errors generic).
    Returns the affected user's id (for audit purposes only) or `None` if
    the token was already unrecognized/revoked."""
    repo = AuthRepository(session)
    token = repo.get_refresh_token_by_hash(hash_refresh_token(raw_refresh_token))
    if token is not None and token.revoked_at is None:
        repo.revoke_refresh_token(token)
        return token.user_id
    return None


def issue_session_for_user(
    session: Session, user: User, *, user_agent: str | None, ip_address: str | None
) -> IssuedSession:
    """Public entry point for issuing a session outside of `authenticate`
    (used by registration's auto-login — see
    `app.api.v1.services.auth_service.register`)."""
    issued, _ = _issue_session(session, user, user_agent=user_agent, ip_address=ip_address)
    return issued


def _issue_session(
    session: Session, user: User, *, user_agent: str | None, ip_address: str | None
) -> tuple[IssuedSession, RefreshToken]:
    repo = AuthRepository(session)
    raw_refresh_token = generate_refresh_token()
    token_row = repo.create_refresh_token(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh_token),
        expires_at=refresh_token_expiry(),
        user_agent=user_agent,
        ip_address=ip_address,
    )
    access_token = create_access_token(user.id, user.is_admin)
    issued = IssuedSession(user=user, access_token=access_token, refresh_token=raw_refresh_token)
    return issued, token_row


__all__ = [
    "IssuedSession",
    "register_user",
    "authenticate",
    "refresh_session",
    "logout",
    "issue_session_for_user",
]
