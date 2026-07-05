"""Shared fixtures for API-layer tests. Each test gets a Session bound to its
own connection + outer transaction (rolled back after the test, same pattern
as tests/simulation/conftest.py and tests/ingestion/conftest.py) wired into a
FastAPI `TestClient` via `dependency_overrides`, so HTTP-level tests never
depend on execution order or leave data behind. Skips gracefully (not a
failure) when Postgres isn't reachable.

Unlike the engine-level fixtures, `app.api.v1.services.simulation_service`
calls `session.commit()`/`session.rollback()` itself (it owns the
transaction boundary — see that module's docstring). `join_transaction_mode`
makes those calls operate on a SAVEPOINT nested inside the outer transaction
instead of ending it outright, so the fixture's own final rollback always
has a live transaction to roll back.

Rate limiting (simulation, read, and — M5 — auth buckets) is overridden to a
no-op for every test by default — real Redis-backed limiting is exercised
deliberately in tests/core/test_rate_limit.py, tests/auth/test_lockout.py
(a distinct, per-account mechanism, not this rate limiter), and
test_simulations.py::test_rate_limit_exceeded_returns_429 (which overrides
the dependency the other direction, to force the limit).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.v1.dependencies import (
    get_db_session,
    rate_limit_ai,
    rate_limit_auth,
    rate_limit_read,
    rate_limit_simulation,
)
from app.core.database import get_engine
from app.main import app


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
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    def _get_db_session_override():
        yield db_session

    app.dependency_overrides[get_db_session] = _get_db_session_override
    app.dependency_overrides[rate_limit_simulation] = lambda: None
    app.dependency_overrides[rate_limit_read] = lambda: None
    app.dependency_overrides[rate_limit_auth] = lambda: None
    app.dependency_overrides[rate_limit_ai] = lambda: None
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
