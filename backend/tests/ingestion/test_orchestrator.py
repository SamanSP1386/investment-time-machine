"""Orchestrator DB-integration tests: exercise the full Retrieve -> Validate
-> Normalize -> Store -> Audit pipeline against a live (transaction-isolated,
rolled-back) database, with the Provider Layer faked out so no live network
call ever occurs. See conftest.py for the db_session fixture.
"""

from datetime import date
from unittest.mock import patch

import pytest
import sqlalchemy as sa

from app.ingestion.exceptions import InvalidSymbolError
from app.ingestion.orchestrator import import_asset, import_asset_prices
from app.ingestion.providers.base import RawPriceRecord
from app.models import Asset, AuditLog, HistoricalPrice
from app.models.enums import AssetType, AuditEventType

pytestmark = pytest.mark.integration


class _FakeTwoDayPriceProvider:
    """Stands in for YFinanceProvider: same capability surface (fetch_prices,
    fetch_dividends, fetch_splits), no network call."""

    name = "yfinance"

    def fetch_prices(self, symbol: str, start: date, end: date) -> list[RawPriceRecord]:
        return [
            RawPriceRecord(
                symbol=symbol,
                price_date=date(2024, 1, 2),
                open=100,
                high=102,
                low=99,
                close=101,
                adjusted_close=101,
                volume=1000,
            ),
            RawPriceRecord(
                symbol=symbol,
                price_date=date(2024, 1, 3),
                open=101,
                high=103,
                low=100,
                close=102,
                adjusted_close=102,
                volume=1100,
            ),
        ]

    def fetch_dividends(self, symbol: str, start: date, end: date) -> list:
        return []

    def fetch_splits(self, symbol: str, start: date, end: date) -> list:
        return []


class _FakeInvalidSymbolProvider:
    name = "yfinance"

    def fetch_prices(self, symbol: str, start: date, end: date) -> list[RawPriceRecord]:
        raise InvalidSymbolError(symbol, self.name)


def test_dry_run_produces_report_but_writes_nothing(db_session) -> None:
    audit_count_before = db_session.execute(
        sa.select(sa.func.count()).select_from(AuditLog)
    ).scalar_one()

    with patch("app.ingestion.orchestrator.get_provider", return_value=_FakeTwoDayPriceProvider()):
        report = import_asset_prices(
            db_session,
            symbol="MT2DRY",
            name="Dry Run Test",
            asset_type=AssetType.STOCK,
            provider_name="yfinance",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            dry_run=True,
        )

    assert report.dry_run is True
    assert report.rows_downloaded == 2
    assert report.rows_imported == 2
    assert report.rows_rejected == 0
    assert report.status == "success"

    asset_count = db_session.execute(
        sa.select(sa.func.count()).select_from(Asset).where(Asset.symbol == "MT2DRY")
    ).scalar_one()
    assert asset_count == 0

    audit_count_after = db_session.execute(
        sa.select(sa.func.count()).select_from(AuditLog)
    ).scalar_one()
    assert audit_count_after == audit_count_before


def test_real_run_persists_asset_prices_and_succeeded_audit_log(db_session) -> None:
    with patch("app.ingestion.orchestrator.get_provider", return_value=_FakeTwoDayPriceProvider()):
        report = import_asset_prices(
            db_session,
            symbol="MT2REAL",
            name="Real Run Test",
            asset_type=AssetType.STOCK,
            provider_name="yfinance",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            dry_run=False,
        )

    assert report.status == "success"
    assert report.rows_imported == 2

    asset = db_session.execute(sa.select(Asset).where(Asset.symbol == "MT2REAL")).scalar_one()
    price_count = db_session.execute(
        sa.select(sa.func.count())
        .select_from(HistoricalPrice)
        .where(HistoricalPrice.asset_id == asset.id)
    ).scalar_one()
    assert price_count == 2

    audit_log = db_session.execute(
        sa.select(AuditLog).where(AuditLog.entity_type == "asset", AuditLog.entity_id == asset.id)
    ).scalar_one()
    assert audit_log.event_type == AuditEventType.DATA_IMPORT_SUCCEEDED
    assert audit_log.details["rows_imported"] == 2


def test_rerunning_the_same_import_is_idempotent(db_session) -> None:
    with patch("app.ingestion.orchestrator.get_provider", return_value=_FakeTwoDayPriceProvider()):
        import_asset_prices(
            db_session,
            symbol="MT2IDEMP",
            name="Idempotency Test",
            asset_type=AssetType.STOCK,
            provider_name="yfinance",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            dry_run=False,
        )
        second_report = import_asset_prices(
            db_session,
            symbol="MT2IDEMP",
            name="Idempotency Test",
            asset_type=AssetType.STOCK,
            provider_name="yfinance",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            dry_run=False,
        )

    assert second_report.rows_imported == 0
    assert second_report.rows_rejected == 2  # both rows already stored
    assert second_report.status == "partial"

    asset = db_session.execute(sa.select(Asset).where(Asset.symbol == "MT2IDEMP")).scalar_one()
    price_count = db_session.execute(
        sa.select(sa.func.count())
        .select_from(HistoricalPrice)
        .where(HistoricalPrice.asset_id == asset.id)
    ).scalar_one()
    assert price_count == 2  # not duplicated


def test_provider_failure_produces_failed_report_and_failed_audit_log(db_session) -> None:
    with patch(
        "app.ingestion.orchestrator.get_provider", return_value=_FakeInvalidSymbolProvider()
    ):
        report = import_asset_prices(
            db_session,
            symbol="MT2FAIL",
            name="Failure Test",
            asset_type=AssetType.STOCK,
            provider_name="yfinance",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            dry_run=False,
        )

    assert report.status == "failed"
    assert report.errors

    asset = db_session.execute(sa.select(Asset).where(Asset.symbol == "MT2FAIL")).scalar_one()
    audit_log = db_session.execute(
        sa.select(AuditLog).where(AuditLog.entity_type == "asset", AuditLog.entity_id == asset.id)
    ).scalar_one()
    assert audit_log.event_type == AuditEventType.DATA_IMPORT_FAILED


def test_dry_run_provider_failure_writes_no_audit_log(db_session) -> None:
    audit_count_before = db_session.execute(
        sa.select(sa.func.count()).select_from(AuditLog)
    ).scalar_one()

    with patch(
        "app.ingestion.orchestrator.get_provider", return_value=_FakeInvalidSymbolProvider()
    ):
        report = import_asset_prices(
            db_session,
            symbol="MT2FAILDRY",
            name="Failure Dry Run Test",
            asset_type=AssetType.STOCK,
            provider_name="yfinance",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            dry_run=True,
        )

    assert report.status == "failed"
    audit_count_after = db_session.execute(
        sa.select(sa.func.count()).select_from(AuditLog)
    ).scalar_one()
    assert audit_count_after == audit_count_before


def test_import_asset_convenience_wrapper_includes_dividends_and_splits(db_session) -> None:
    with patch("app.ingestion.orchestrator.get_provider", return_value=_FakeTwoDayPriceProvider()):
        reports = import_asset(
            db_session,
            symbol="MT2FULL",
            name="Full Wrapper Test",
            asset_type=AssetType.STOCK,
            provider_name="yfinance",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            dry_run=True,
        )

    assert set(reports.keys()) == {"prices", "dividends", "splits"}
    assert reports["prices"].rows_downloaded == 2
    assert reports["dividends"].rows_downloaded == 0
    assert reports["splits"].rows_downloaded == 0
