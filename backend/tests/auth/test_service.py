"""DB-integration tests for `app.auth.service` — the Identity Management
domain layer. Transaction-isolated and rolled back per test (see
tests/auth/conftest.py), matching the pattern already established in
tests/simulation/ and tests/ingestion/.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.auth import service as auth_service
from app.auth.exceptions import (
    AccountInactiveError,
    AccountLockedError,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    RefreshTokenReuseDetectedError,
    WeakPasswordError,
)
from app.auth.lockout import AccountLockout
from app.auth.tokens import decode_access_token, hash_refresh_token
from app.core.rate_limit import get_redis_client
from app.models import RefreshToken
from tests.auth.conftest import make_user

pytestmark = pytest.mark.integration


def _lockout(max_attempts: int = 5) -> AccountLockout:
    return AccountLockout(get_redis_client(), max_attempts=max_attempts, window_seconds=60)


def _unique_email() -> str:
    return f"svc-test-{uuid.uuid4()}@example.com"


# --- register_user -----------------------------------------------------


def test_register_user_creates_account_with_hashed_password(db_session):
    email = _unique_email()
    user = auth_service.register_user(
        db_session, email=email, password="a-strong-password", display_name="  Jane Doe  "
    )

    assert user.email == email.strip().lower()
    assert user.display_name == "Jane Doe"
    assert user.password_hash != "a-strong-password"
    assert user.is_active is True
    assert user.is_admin is False


def test_register_user_normalizes_email_case_and_whitespace(db_session):
    user = auth_service.register_user(
        db_session,
        email="  MixedCase@Example.com  ",
        password="a-strong-password",
        display_name="X",
    )
    assert user.email == "mixedcase@example.com"


def test_register_user_rejects_duplicate_email(db_session):
    email = _unique_email()
    auth_service.register_user(
        db_session, email=email, password="a-strong-password", display_name="First"
    )

    with pytest.raises(EmailAlreadyRegisteredError):
        auth_service.register_user(
            db_session, email=email, password="another-strong-password", display_name="Second"
        )


def test_register_user_rejects_weak_password_before_any_write(db_session):
    email = _unique_email()
    with pytest.raises(WeakPasswordError):
        auth_service.register_user(db_session, email=email, password="short", display_name="X")

    from app.models import User

    assert (
        db_session.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
        is None
    )


# --- authenticate --------------------------------------------------------


def test_authenticate_succeeds_and_issues_a_session(db_session):
    user = make_user(db_session)

    issued = auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=_lockout(),
        user_agent="pytest",
        ip_address="127.0.0.1",
    )

    assert issued.user.id == user.id
    payload = decode_access_token(issued.access_token)
    assert payload["sub"] == str(user.id)

    token_row = db_session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(issued.refresh_token)
        )
    ).scalar_one()
    assert token_row.user_id == user.id
    assert token_row.revoked_at is None


def test_authenticate_rejects_unknown_email_with_generic_error(db_session):
    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate(
            db_session,
            email=_unique_email(),
            password="whatever",
            lockout=_lockout(),
            user_agent=None,
            ip_address=None,
        )


def test_authenticate_rejects_wrong_password_with_generic_error(db_session):
    user = make_user(db_session)

    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate(
            db_session,
            email=user.email,
            password="totally-wrong",
            lockout=_lockout(),
            user_agent=None,
            ip_address=None,
        )


def test_authenticate_locks_out_after_repeated_failures(db_session):
    user = make_user(db_session)
    lockout = _lockout(max_attempts=3)

    for _ in range(3):
        with pytest.raises(InvalidCredentialsError):
            auth_service.authenticate(
                db_session,
                email=user.email,
                password="wrong",
                lockout=lockout,
                user_agent=None,
                ip_address=None,
            )

    # Even the CORRECT password is now rejected — as AccountLockedError, not
    # InvalidCredentialsError — until the lockout window passes.
    with pytest.raises(AccountLockedError):
        auth_service.authenticate(
            db_session,
            email=user.email,
            password="correct-horse",
            lockout=lockout,
            user_agent=None,
            ip_address=None,
        )


def test_authenticate_rejects_inactive_account_only_after_correct_password(db_session):
    """Security-critical ordering: a wrong password against a suspended
    account must still yield the generic InvalidCredentialsError, never
    AccountInactiveError — otherwise the suspended-account error becomes an
    account-enumeration oracle."""
    user = make_user(db_session, is_active=False)
    lockout = _lockout()

    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate(
            db_session,
            email=user.email,
            password="wrong-password",
            lockout=lockout,
            user_agent=None,
            ip_address=None,
        )

    with pytest.raises(AccountInactiveError):
        auth_service.authenticate(
            db_session,
            email=user.email,
            password="correct-horse",
            lockout=lockout,
            user_agent=None,
            ip_address=None,
        )


def test_authenticate_resets_lockout_counter_on_success(db_session):
    user = make_user(db_session)
    lockout = _lockout(max_attempts=3)

    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate(
            db_session,
            email=user.email,
            password="wrong",
            lockout=lockout,
            user_agent=None,
            ip_address=None,
        )

    auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=lockout,
        user_agent=None,
        ip_address=None,
    )

    locked, _ = lockout.is_locked(user.email)
    assert locked is False


# --- refresh_session -----------------------------------------------------


def test_refresh_rotates_the_token(db_session):
    user = make_user(db_session)
    issued = auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=_lockout(),
        user_agent=None,
        ip_address=None,
    )

    refreshed = auth_service.refresh_session(
        db_session, raw_refresh_token=issued.refresh_token, user_agent=None, ip_address=None
    )

    assert refreshed.refresh_token != issued.refresh_token
    old_row = db_session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(issued.refresh_token)
        )
    ).scalar_one()
    assert old_row.revoked_at is not None
    new_row = db_session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(refreshed.refresh_token)
        )
    ).scalar_one()
    assert old_row.replaced_by_id == new_row.id


def test_refresh_rejects_unknown_token(db_session):
    with pytest.raises(InvalidRefreshTokenError):
        auth_service.refresh_session(
            db_session, raw_refresh_token="not-a-real-token", user_agent=None, ip_address=None
        )


def test_refresh_rejects_expired_token(db_session):
    user = make_user(db_session)
    issued = auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=_lockout(),
        user_agent=None,
        ip_address=None,
    )
    token_row = db_session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(issued.refresh_token)
        )
    ).scalar_one()
    token_row.expires_at = datetime.now(UTC) - timedelta(days=1)
    db_session.flush()

    with pytest.raises(InvalidRefreshTokenError):
        auth_service.refresh_session(
            db_session, raw_refresh_token=issued.refresh_token, user_agent=None, ip_address=None
        )


def test_refresh_reuse_is_detected_and_revokes_every_active_session(db_session):
    """Two "devices" log in (two IssuedSessions). Device A refreshes
    (rotating its token). Device A's OLD token is then replayed (simulating
    a thief who captured it before rotation) — this must fail AND must
    revoke Device B's still-otherwise-valid session too, per the approved
    "Refresh Token Rotation" Founder Decision's reuse-detection design."""
    user = make_user(db_session)
    device_a = auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=_lockout(),
        user_agent="device-a",
        ip_address=None,
    )
    device_b = auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=_lockout(),
        user_agent="device-b",
        ip_address=None,
    )

    # Device A rotates normally.
    auth_service.refresh_session(
        db_session, raw_refresh_token=device_a.refresh_token, user_agent="device-a", ip_address=None
    )

    # The old (now-rotated-away) Device A token is replayed by an attacker.
    with pytest.raises(RefreshTokenReuseDetectedError):
        auth_service.refresh_session(
            db_session,
            raw_refresh_token=device_a.refresh_token,
            user_agent="attacker",
            ip_address=None,
        )

    # Device B's token, though never itself misused, is now revoked too.
    device_b_row = db_session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(device_b.refresh_token)
        )
    ).scalar_one()
    assert device_b_row.revoked_at is not None

    with pytest.raises(InvalidRefreshTokenError):
        auth_service.refresh_session(
            db_session,
            raw_refresh_token=device_b.refresh_token,
            user_agent="device-b",
            ip_address=None,
        )


def test_refresh_rejects_suspended_user(db_session):
    user = make_user(db_session)
    issued = auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=_lockout(),
        user_agent=None,
        ip_address=None,
    )
    user.is_active = False
    db_session.flush()

    with pytest.raises(AccountInactiveError):
        auth_service.refresh_session(
            db_session, raw_refresh_token=issued.refresh_token, user_agent=None, ip_address=None
        )


# --- logout ---------------------------------------------------------------


def test_logout_revokes_the_token(db_session):
    user = make_user(db_session)
    issued = auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=_lockout(),
        user_agent=None,
        ip_address=None,
    )

    affected_user_id = auth_service.logout(db_session, raw_refresh_token=issued.refresh_token)

    assert affected_user_id == user.id
    row = db_session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(issued.refresh_token)
        )
    ).scalar_one()
    assert row.revoked_at is not None


def test_logout_is_idempotent_for_an_already_revoked_token(db_session):
    user = make_user(db_session)
    issued = auth_service.authenticate(
        db_session,
        email=user.email,
        password="correct-horse",
        lockout=_lockout(),
        user_agent=None,
        ip_address=None,
    )
    auth_service.logout(db_session, raw_refresh_token=issued.refresh_token)

    # Second logout with the same (already-revoked) token must not raise.
    result = auth_service.logout(db_session, raw_refresh_token=issued.refresh_token)
    assert result is None


def test_logout_is_a_silent_no_op_for_an_unknown_token(db_session):
    result = auth_service.logout(db_session, raw_refresh_token="not-a-real-token")
    assert result is None
