"""Storage Layer DB-integration tests. See conftest.py for the db_session
fixture (isolated transaction per test, rolled back afterward)."""

import uuid
from datetime import date
from decimal import Decimal

import pytest
import sqlalchemy as sa

from app.ingestion.exceptions import DatabaseConstraintError
from app.ingestion.storage import IngestionRepository
from app.models import Asset, HistoricalPrice
from app.models.enums import AssetType

pytestmark = pytest.mark.integration


def _price_values(asset_id: uuid.UUID, price_date: date, data_source: str = "yfinance") -> dict:
    return {
        "asset_id": asset_id,
        "price_date": price_date,
        "open_price": Decimal("100"),
        "high_price": Decimal("102"),
        "low_price": Decimal("99"),
        "close_price": Decimal("101"),
        "adjusted_close_price": Decimal("101"),
        "volume": 1000,
        "data_source": data_source,
    }


def test_get_or_create_asset_creates_once_and_reuses_on_second_call(db_session) -> None:
    repo = IngestionRepository(db_session)

    first = repo.get_or_create_asset(
        symbol="MT1TEST",
        name="Milestone Test One",
        asset_type=AssetType.STOCK,
        data_source="yfinance",
    )
    second = repo.get_or_create_asset(
        symbol="MT1TEST",
        name="Ignored On Reuse",
        asset_type=AssetType.STOCK,
        data_source="yfinance",
    )

    assert first.id == second.id
    count = db_session.execute(
        sa.select(sa.func.count()).select_from(Asset).where(Asset.symbol == "MT1TEST")
    ).scalar_one()
    assert count == 1


def test_get_asset_by_symbol_returns_none_when_absent(db_session) -> None:
    repo = IngestionRepository(db_session)
    assert repo.get_asset_by_symbol("DOES-NOT-EXIST") is None


def test_get_or_create_indicator_creates_once_and_reuses(db_session) -> None:
    repo = IngestionRepository(db_session)

    first = repo.get_or_create_indicator(
        indicator_code="MT1CPI", name="Test CPI", unit="index", data_source="fred"
    )
    second = repo.get_or_create_indicator(
        indicator_code="MT1CPI", name="Ignored On Reuse", unit="index", data_source="fred"
    )

    assert first.id == second.id


def test_upsert_price_returns_true_on_insert_and_false_on_duplicate(db_session) -> None:
    repo = IngestionRepository(db_session)
    asset = repo.get_or_create_asset(
        symbol="MT1PRICE", name="Price Test", asset_type=AssetType.STOCK, data_source="yfinance"
    )
    values = _price_values(asset.id, date(2024, 1, 2))

    first_result = repo.upsert_price(values)
    second_result = repo.upsert_price(values)

    assert first_result is True
    assert second_result is False
    count = db_session.execute(
        sa.select(sa.func.count())
        .select_from(HistoricalPrice)
        .where(HistoricalPrice.asset_id == asset.id)
    ).scalar_one()
    assert count == 1


def test_upsert_price_constraint_violation_raises_and_preserves_prior_rows(db_session) -> None:
    """Validates the SAVEPOINT behavior in IngestionRepository._upsert: a
    genuine constraint violation (here, a foreign key pointing at a
    nonexistent asset) must not discard rows already upserted earlier in the
    same transaction."""
    repo = IngestionRepository(db_session)
    asset = repo.get_or_create_asset(
        symbol="MT1SAVE", name="Savepoint Test", asset_type=AssetType.STOCK, data_source="yfinance"
    )

    good_values = _price_values(asset.id, date(2024, 1, 2))
    assert repo.upsert_price(good_values) is True

    bad_values = _price_values(uuid.uuid4(), date(2024, 1, 3))  # no such asset -> FK violation
    with pytest.raises(DatabaseConstraintError):
        repo.upsert_price(bad_values)

    count = db_session.execute(
        sa.select(sa.func.count())
        .select_from(HistoricalPrice)
        .where(HistoricalPrice.asset_id == asset.id)
    ).scalar_one()
    assert count == 1
