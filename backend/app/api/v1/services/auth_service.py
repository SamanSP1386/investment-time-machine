"""API-layer service for registration/login/refresh/logout. Thin bridge
between the external API contract and `app.auth.service` (pure business
logic) — mirrors `simulation_service`'s established shape exactly: the
domain layer only `flush()`es, this layer owns the commit/rollback boundary
per outcome and records exactly one audit entry per attempt.

Transaction boundary note (same reasoning as `simulation_service`'s module
docstring, applied to a new case): `app.auth.service.refresh_session`
revokes every active refresh token for a user *before* raising
`RefreshTokenReuseDetectedError`, as a security precaution against a stolen,
already-rotated token being replayed. That revocation is a real, intentional
write and must be **committed**, not discarded — a plain rollback here would
silently undo the very security response the reuse detection exists to
perform. This is why `RefreshTokenReuseDetectedError` is caught separately,
and first, from the more general `InvalidRefreshTokenError` it subclasses.
"""

from sqlalchemy.orm import Session

from app.api.v1.audit import record_auth_audit
from app.api.v1.schemas.auth import LoginRequest, RegisterRequest
from app.auth import service as auth_domain_service
from app.auth.exceptions import (
    AccountInactiveError,
    AccountLockedError,
    AuthError,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    RefreshTokenReuseDetectedError,
    WeakPasswordError,
)
from app.auth.lockout import AccountLockout
from app.auth.service import IssuedSession
from app.core.config import get_settings
from app.core.rate_limit import get_redis_client
from app.models.enums import AuditEventType

_ERROR_CODES: dict[type[AuthError], str] = {
    EmailAlreadyRegisteredError: "EMAIL_ALREADY_REGISTERED",
    WeakPasswordError: "WEAK_PASSWORD",
    InvalidCredentialsError: "INVALID_CREDENTIALS",
    AccountLockedError: "ACCOUNT_LOCKED",
    AccountInactiveError: "ACCOUNT_INACTIVE",
    InvalidRefreshTokenError: "INVALID_REFRESH_TOKEN",
    # Deliberately the same code as the plain InvalidRefreshTokenError above:
    # an attacker must never learn that reuse detection specifically fired
    # (see app.auth.exceptions.RefreshTokenReuseDetectedError docstring).
    RefreshTokenReuseDetectedError: "INVALID_REFRESH_TOKEN",
}


def get_account_lockout() -> AccountLockout:
    settings = get_settings()
    return AccountLockout(
        get_redis_client(),
        max_attempts=settings.account_lockout_max_attempts,
        window_seconds=settings.account_lockout_window_minutes * 60,
    )


def register(
    session: Session,
    request: RegisterRequest,
    *,
    request_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> IssuedSession:
    try:
        user = auth_domain_service.register_user(
            session,
            email=request.email,
            password=request.password,
            display_name=request.display_name,
        )
        session.commit()
    except (EmailAlreadyRegisteredError, WeakPasswordError) as exc:
        session.rollback()
        record_auth_audit(
            session,
            event_type=AuditEventType.USER_REGISTERED,
            user_id=None,
            request_id=request_id,
            details={"status": "failed", "error_code": _ERROR_CODES[type(exc)]},
        )
        session.commit()
        raise

    # MVP has no email verification (deferred, see the M5 design review) —
    # registration auto-issues a session so the user lands authenticated,
    # matching Founder Specification 3.2.9's Account Creation flow
    # ("Create Account -> Login -> Access Dashboard" collapsed into one step).
    issued = auth_domain_service.issue_session_for_user(
        session, user, user_agent=user_agent, ip_address=ip_address
    )
    session.commit()
    record_auth_audit(
        session,
        event_type=AuditEventType.USER_REGISTERED,
        user_id=user.id,
        request_id=request_id,
        details={"status": "succeeded"},
    )
    session.commit()
    return issued


def login(
    session: Session,
    request: LoginRequest,
    *,
    request_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> IssuedSession:
    lockout = get_account_lockout()
    try:
        issued = auth_domain_service.authenticate(
            session,
            email=request.email,
            password=request.password,
            lockout=lockout,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        session.commit()
    except (InvalidCredentialsError, AccountLockedError, AccountInactiveError) as exc:
        session.rollback()
        record_auth_audit(
            session,
            event_type=AuditEventType.USER_LOGIN_FAILED,
            user_id=None,
            request_id=request_id,
            details={
                "status": "failed",
                "error_code": _ERROR_CODES[type(exc)],
                "email": request.email.strip().lower(),
            },
        )
        session.commit()
        raise

    record_auth_audit(
        session,
        event_type=AuditEventType.USER_LOGIN_SUCCEEDED,
        user_id=issued.user.id,
        request_id=request_id,
        details={"status": "succeeded"},
    )
    session.commit()
    return issued


def refresh(
    session: Session,
    raw_refresh_token: str,
    *,
    request_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> IssuedSession:
    try:
        issued = auth_domain_service.refresh_session(
            session,
            raw_refresh_token=raw_refresh_token,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        session.commit()
    except RefreshTokenReuseDetectedError as exc:
        # The domain layer already revoked every active token for this user
        # before raising — that write must survive. See module docstring.
        session.commit()
        record_auth_audit(
            session,
            event_type=AuditEventType.USER_LOGIN_FAILED,
            user_id=None,
            request_id=request_id,
            details={"status": "failed", "error_code": _ERROR_CODES[type(exc)]},
        )
        session.commit()
        raise
    except (InvalidRefreshTokenError, AccountInactiveError) as exc:
        session.rollback()
        record_auth_audit(
            session,
            event_type=AuditEventType.USER_LOGIN_FAILED,
            user_id=None,
            request_id=request_id,
            details={"status": "failed", "error_code": _ERROR_CODES[type(exc)]},
        )
        session.commit()
        raise

    record_auth_audit(
        session,
        event_type=AuditEventType.USER_LOGIN_SUCCEEDED,
        user_id=issued.user.id,
        request_id=request_id,
        details={"status": "succeeded", "action": "refresh"},
    )
    session.commit()
    return issued


def logout(session: Session, raw_refresh_token: str | None, *, request_id: str) -> None:
    affected_user_id = None
    if raw_refresh_token is not None:
        affected_user_id = auth_domain_service.logout(session, raw_refresh_token=raw_refresh_token)
    session.commit()
    record_auth_audit(
        session,
        event_type=AuditEventType.USER_LOGOUT,
        user_id=affected_user_id,
        request_id=request_id,
        details={"status": "succeeded"},
    )
    session.commit()
