"""Tests proving `POST /api/v1/simulations` writes exactly one `audit_logs`
row per request — success, pre-flight validation failure (asset not found),
mid-simulation failure (missing historical data), and Pydantic-level request
validation failure. Closes KI-026 (`docs/KNOWN_ISSUES.md`).
"""

import uuid
from datetime import date

from sqlalchemy import select

from app.core.database import get_session_factory
from app.models import AuditLog
from app.models.enums import AuditEventType
from tests.simulation.conftest import make_asset, make_price


def _audit_logs_for_symbol(db_session, symbol: str) -> list[AuditLog]:
    rows = (
        db_session.execute(select(AuditLog).where(AuditLog.entity_type == "simulation"))
        .scalars()
        .all()
    )
    return [row for row in rows if row.details.get("asset_symbol") == symbol]


def _make_priced_asset(db_session):
    symbol = f"AUD{uuid.uuid4().hex[:8].upper()}"
    asset = make_asset(db_session, symbol=symbol, name="Audit Test Co")
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    make_price(db_session, asset, date(2021, 1, 4), "120.00")
    db_session.flush()
    return symbol


def test_audit_log_written_on_successful_simulation(client, db_session):
    symbol = _make_priced_asset(db_session)

    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )
    assert response.status_code == 201
    simulation_id = response.json()["data"]["id"]

    logs = _audit_logs_for_symbol(db_session, symbol)
    assert len(logs) == 1
    log = logs[0]
    assert log.event_type == AuditEventType.SIMULATION_CREATED
    assert log.user_id is None
    assert str(log.entity_id) == simulation_id
    assert log.details["status"] == "succeeded"
    assert log.details["error_code"] is None
    assert log.details["simulation_id"] == simulation_id
    assert log.details["request_id"]


def test_audit_log_written_on_asset_not_found(client, db_session):
    symbol = f"NOSUCH{uuid.uuid4().hex[:6].upper()}"

    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )
    assert response.status_code == 404

    logs = _audit_logs_for_symbol(db_session, symbol)
    assert len(logs) == 1
    log = logs[0]
    assert log.details["status"] == "failed"
    assert log.details["error_code"] == "ASSET_NOT_FOUND"
    assert log.details["simulation_id"] is None
    # No Simulation row exists for a pre-flight failure, so entity_id is a
    # synthetic correlation id, not a reference to a real row.
    assert log.entity_id is not None


def test_audit_log_written_on_missing_historical_data(client, db_session):
    symbol = f"AUD{uuid.uuid4().hex[:8].upper()}"
    asset = make_asset(db_session, symbol=symbol)
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    # No price row for the end date -> MissingHistoricalDataError.
    db_session.flush()

    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )
    assert response.status_code == 422
    error_simulation_id = response.json()["error"]["simulation_id"]
    assert error_simulation_id is not None

    logs = _audit_logs_for_symbol(db_session, symbol)
    assert len(logs) == 1
    log = logs[0]
    assert log.details["status"] == "failed"
    assert log.details["error_code"] == "MISSING_HISTORICAL_DATA"
    assert log.details["simulation_id"] == error_simulation_id
    assert str(log.entity_id) == error_simulation_id


def test_audit_log_written_on_request_validation_failure(client, db_session):
    # This one path (record_simulation_request_validation_audit,
    # app/api/v1/audit.py) deliberately opens and commits its own session,
    # since a Pydantic-level validation failure never reaches
    # simulation_service.create_simulation and so never touches the
    # request-scoped, rollback-isolated `db_session` this test otherwise
    # relies on. That means the row it writes is genuinely, permanently
    # committed on a separate connection -- not cleaned up by the test
    # fixture's own rollback -- so it must be deleted explicitly here to
    # keep this test isolated like every other test in this suite.
    symbol = f"AUD{uuid.uuid4().hex[:8].upper()}"
    log_id = None
    try:
        response = client.post(
            "/api/v1/simulations",
            json={
                "asset_symbol": symbol,
                "investment_amount": "0",
                "start_date": "2020-01-02",
                "end_date": "2021-01-04",
            },
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

        logs = _audit_logs_for_symbol(db_session, symbol)
        assert len(logs) == 1
        log = logs[0]
        log_id = log.id
        assert log.details["status"] == "failed"
        assert log.details["error_code"] == "VALIDATION_ERROR"
        assert log.details["simulation_id"] is None
    finally:
        if log_id is not None:
            cleanup_session = get_session_factory()()
            try:
                row = cleanup_session.get(AuditLog, log_id)
                if row is not None:
                    cleanup_session.delete(row)
                    cleanup_session.commit()
            finally:
                cleanup_session.close()
