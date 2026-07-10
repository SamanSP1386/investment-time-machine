"""Shared fixtures for Simulation Engine DB-integration tests. Each test gets
a Session bound to its own connection + outer transaction, rolled back after
the test — nothing is ever actually committed. Skips gracefully (not a
failure) when Postgres isn't reachable, matching the pattern established in
tests/test_migrations.py (M1) and tests/ingestion/conftest.py (M2).
"""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.models import (
    Asset,
    Dividend,
    EconomicIndicator,
    EconomicIndicatorValue,
    HistoricalPrice,
    StockSplit,
)
from app.models.enums import AssetType


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


def make_asset(session: Session, symbol: str, name: str = "Test Asset") -> Asset:
    asset = Asset(symbol=symbol, name=name, asset_type=AssetType.STOCK, data_source="manual_import")
    session.add(asset)
    session.flush()
    return asset


def make_price(
    session: Session,
    asset: Asset,
    price_date: date,
    close: str,
    *,
    open_: str | None = None,
    high: str | None = None,
    low: str | None = None,
    adjusted_close: str | None = None,
    volume: int = 1000,
) -> HistoricalPrice:
    """Convenience fixture builder: defaults OHLC to the close price when not
    given, since most known-answer tests only care about `close_price`."""
    price = HistoricalPrice(
        asset_id=asset.id,
        price_date=price_date,
        open_price=Decimal(open_ if open_ is not None else close),
        high_price=Decimal(high if high is not None else close),
        low_price=Decimal(low if low is not None else close),
        close_price=Decimal(close),
        adjusted_close_price=Decimal(adjusted_close if adjusted_close is not None else close),
        volume=volume,
        data_source="manual_import",
    )
    session.add(price)
    session.flush()
    return price


def make_dividend(session: Session, asset: Asset, ex_dividend_date: date, amount: str) -> Dividend:
    dividend = Dividend(
        asset_id=asset.id,
        ex_dividend_date=ex_dividend_date,
        dividend_amount=Decimal(amount),
        currency="USD",
        data_source="manual_import",
    )
    session.add(dividend)
    session.flush()
    return dividend


def make_split(session: Session, asset: Asset, split_date: date, split_ratio: str) -> StockSplit:
    split = StockSplit(
        asset_id=asset.id,
        split_date=split_date,
        split_ratio=Decimal(split_ratio),
        data_source="manual_import",
    )
    session.add(split)
    session.flush()
    return split


def make_cpi_observation(
    session: Session, indicator_code: str, observation_date: date, value: str
) -> EconomicIndicatorValue:
    indicator = session.execute(
        select(EconomicIndicator).where(EconomicIndicator.indicator_code == indicator_code)
    ).scalar_one_or_none()
    if indicator is None:
        indicator = EconomicIndicator(
            indicator_code=indicator_code,
            name="Test CPI",
            unit="index",
            data_source="manual_import",
        )
        session.add(indicator)
        session.flush()

    observation = EconomicIndicatorValue(
        indicator_id=indicator.id,
        observation_date=observation_date,
        value=Decimal(value),
        data_source="manual_import",
    )
    session.add(observation)
    session.flush()
    return observation
