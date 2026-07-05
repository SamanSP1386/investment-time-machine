"""Shared fixtures for Identity Management DB-integration tests. Mirrors
tests/simulation/conftest.py exactly: a Session bound to its own connection
+ outer transaction, rolled back after the test — nothing is ever actually
committed. Skips gracefully when Postgres isn't reachable.

Account lockout state lives in real Redis, not the database — it is
deliberately NOT part of the per-test rollback (see app.auth.lockout). Every
call to `make_user()` therefore defaults to a fresh, unique email so that
one test's recorded login failures can never bleed into another test's
lockout counter; pass an explicit `email` only when a test genuinely needs a
fixed, known value.
"""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.models import User


def _database_reachable() -> bool:
    try:
        with get_engine().connect():
            return True
    except Exception:
        return False


@pytest.fixture
def db_session():
    if not _database_reachable():
        pytest.skip("Postgres not reachable in this environment — see docs/KNOWN_ISSUES.md")

    connection = get_engine().connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


class FakeAccountLockout:
    """In-memory test double for `app.auth.lockout.AccountLockout`, matching
    its exact public interface (`is_locked`/`record_failed_attempt`/`reset`).

    `auth_service.authenticate()`'s own logic (lockout-before-password-check,
    reset-on-success) is what `tests/auth/test_service.py` needs to exercise
    deterministically — it does not need to exercise Redis itself (that is
    `tests/auth/test_lockout.py`'s job, against `AccountLockout` directly).
    Requiring a real, reachable Redis instance for every DB-integration test
    in that file made two of them silently depend on CI's Redis
    availability: `AccountLockout` fails open (never locks) whenever Redis
    is unreachable, which is correct production behavior, but meant a test
    asserting real enforcement would incorrectly pass or fail depending on
    an unrelated environment property rather than the code under test. This
    fake has no such dependency, so `authenticate()`'s own lockout-handling
    logic is verified the same way in every environment, CI included.
    """

    def __init__(self, max_attempts: int, window_seconds: int = 60) -> None:
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds
        self._counts: dict[str, int] = {}

    def is_locked(self, email: str) -> tuple[bool, int]:
        return self._counts.get(email, 0) >= self._max_attempts, (
            self._window_seconds if self._counts.get(email, 0) >= self._max_attempts else 0
        )

    def record_failed_attempt(self, email: str) -> None:
        self._counts[email] = self._counts.get(email, 0) + 1

    def reset(self, email: str) -> None:
        self._counts.pop(email, None)


def make_user(
    session: Session,
    *,
    email: str | None = None,
    password_hash: str | None = None,
    display_name: str = "Jane Doe",
    is_active: bool = True,
    is_admin: bool = False,
) -> User:
    from app.auth.password import hash_password

    user = User(
        email=email if email is not None else f"jane-{uuid.uuid4()}@example.com",
        password_hash=(
            password_hash if password_hash is not None else hash_password("correct-horse")
        ),
        display_name=display_name,
        is_active=is_active,
        is_admin=is_admin,
    )
    session.add(user)
    session.flush()
    return user
