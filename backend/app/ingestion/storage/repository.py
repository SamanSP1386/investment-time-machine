"""Storage Layer: the only ingestion component that touches the database.
Only validated, normalized records may reach these methods — no provider
objects, no raw dicts that skipped validation. Writes are idempotent: an
import that overlaps a previous one silently skips rows that already exist
(matching each table's natural-key unique constraint) rather than failing.
"""

import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ingestion.exceptions import DatabaseConstraintError
from app.models import (
    Asset,
    Dividend,
    EconomicIndicator,
    EconomicIndicatorValue,
    HistoricalPrice,
    StockSplit,
)
from app.models.enums import AssetType

logger = logging.getLogger(__name__)


class IngestionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_asset_by_symbol(self, symbol: str) -> Asset | None:
        return self._session.execute(
            select(Asset).where(Asset.symbol == symbol)
        ).scalar_one_or_none()

    def get_indicator_by_code(self, indicator_code: str) -> EconomicIndicator | None:
        return self._session.execute(
            select(EconomicIndicator).where(EconomicIndicator.indicator_code == indicator_code)
        ).scalar_one_or_none()

    def get_or_create_asset(
        self, *, symbol: str, name: str, asset_type: AssetType, data_source: str
    ) -> Asset:
        """Not race-safe against a concurrent ingestion run creating the same
        symbol between the SELECT and the INSERT — acceptable today because
        the platform has no concurrent/background ingestion workers (MVP
        scope, single-process). Revisit with an ON CONFLICT-based upsert if
        that changes."""
        existing = self._session.execute(
            select(Asset).where(Asset.symbol == symbol)
        ).scalar_one_or_none()
        if existing is not None:
            return existing

        asset = Asset(symbol=symbol, name=name, asset_type=asset_type, data_source=data_source)
        self._session.add(asset)
        self._session.flush()
        return asset

    def get_or_create_indicator(
        self, *, indicator_code: str, name: str, unit: str, data_source: str
    ) -> EconomicIndicator:
        existing = self._session.execute(
            select(EconomicIndicator).where(EconomicIndicator.indicator_code == indicator_code)
        ).scalar_one_or_none()
        if existing is not None:
            return existing

        indicator = EconomicIndicator(
            indicator_code=indicator_code, name=name, unit=unit, data_source=data_source
        )
        self._session.add(indicator)
        self._session.flush()
        return indicator

    def upsert_price(self, normalized: dict) -> bool:
        return self._upsert(
            HistoricalPrice, normalized, conflict_columns=["asset_id", "price_date", "data_source"]
        )

    def upsert_dividend(self, normalized: dict) -> bool:
        return self._upsert(
            Dividend,
            normalized,
            conflict_columns=["asset_id", "ex_dividend_date", "dividend_amount"],
        )

    def upsert_split(self, normalized: dict) -> bool:
        return self._upsert(StockSplit, normalized, conflict_columns=["asset_id", "split_date"])

    def upsert_indicator_value(self, normalized: dict) -> bool:
        return self._upsert(
            EconomicIndicatorValue,
            normalized,
            conflict_columns=["indicator_id", "observation_date", "data_source"],
        )

    def _upsert(self, model: type, values: dict, *, conflict_columns: list[str]) -> bool:
        """Idempotent insert: True if a new row was written, False if a row
        already satisfying the natural-key unique constraint existed (a
        normal, expected outcome on re-import — not an error, and reported
        by the caller as a skipped duplicate, not a rejection).

        Runs inside a SAVEPOINT (`begin_nested`) rather than directly in the
        import's outer transaction: Postgres aborts an entire transaction on
        the first unhandled statement error, so without a SAVEPOINT here, one
        genuinely bad record (a real constraint violation, not an ordinary
        duplicate) would silently discard every row already upserted earlier
        in the same import batch.
        """
        try:
            with self._session.begin_nested():
                statement = (
                    pg_insert(model)
                    .values(**values)
                    .on_conflict_do_nothing(index_elements=conflict_columns)
                    .returning(model.id)
                )
                result = self._session.execute(statement)
                inserted_id = result.first()
        except IntegrityError as exc:
            raise DatabaseConstraintError(
                f"unexpected constraint violation inserting into " f"{model.__tablename__}: {exc}"
            ) from exc
        return inserted_id is not None
