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
