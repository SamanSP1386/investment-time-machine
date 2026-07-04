"""Audit Layer DB-integration tests. See conftest.py for the db_session
fixture (isolated transaction per test, rolled back afterward)."""

import pytest

from app.ingestion.audit import record_import_audit
from app.ingestion.storage import IngestionRepository
from app.models import AuditLog
from app.models.enums import AssetType, AuditEventType

pytestmark = pytest.mark.integration


def test_record_import_audit_writes_succeeded_event_with_details(db_session) -> None:
    repo = IngestionRepository(db_session)
    asset = repo.get_or_create_asset(
        symbol="MT1AUDIT1",
        name="Audit Test One",
        asset_type=AssetType.STOCK,
        data_source="yfinance",
    )

    audit_log = record_import_audit(
        db_session,
        entity_type="asset",
        entity_id=asset.id,
        succeeded=True,
        details={"provider": "yfinance", "rows_imported": 5},
    )

    assert audit_log.event_type == AuditEventType.DATA_IMPORT_SUCCEEDED
    fetched = db_session.get(AuditLog, audit_log.id)
    assert fetched is not None
    assert fetched.entity_type == "asset"
    assert fetched.entity_id == asset.id
    assert fetched.details["rows_imported"] == 5


def test_record_import_audit_writes_failed_event_on_failure(db_session) -> None:
    repo = IngestionRepository(db_session)
    asset = repo.get_or_create_asset(
        symbol="MT1AUDIT2",
        name="Audit Test Two",
        asset_type=AssetType.STOCK,
        data_source="yfinance",
    )

    audit_log = record_import_audit(
        db_session,
        entity_type="asset",
        entity_id=asset.id,
        succeeded=False,
        details={"errors": ["provider unavailable"]},
    )

    assert audit_log.event_type == AuditEventType.DATA_IMPORT_FAILED


def test_record_import_audit_supports_economic_indicator_entity_type(db_session) -> None:
    repo = IngestionRepository(db_session)
    indicator = repo.get_or_create_indicator(
        indicator_code="MT1AUDITCPI", name="Audit CPI", unit="index", data_source="fred"
    )

    audit_log = record_import_audit(
        db_session,
        entity_type="economic_indicator",
        entity_id=indicator.id,
        succeeded=True,
        details={"rows_imported": 12},
    )

    assert audit_log.entity_type == "economic_indicator"
    assert audit_log.entity_id == indicator.id
