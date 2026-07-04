"""Shared fixtures for ingestion DB-integration tests. Each test gets a
Session bound to its own connection + outer transaction, rolled back after
the test — so tests never commit real data and never depend on execution
order. Skips gracefully (not a failure) when Postgres isn't reachable,
matching the pattern established in tests/test_migrations.py (M1).
"""

import pytest
from sqlalchemy.orm import Session

from app.core.database import get_engine


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
