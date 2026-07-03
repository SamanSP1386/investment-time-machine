import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.asset import Asset


class StockSplit(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Corporate actions that change shares outstanding without changing total
    value. split_ratio is stored as a multiplication factor: a 4-for-1 split is
    4.0, a 1-for-10 reverse split is 0.1. No split-adjustment algorithm is
    implemented here — that is Simulation Engine scope, not schema scope."""

    __tablename__ = "stock_splits"

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False
    )
    split_date: Mapped[date] = mapped_column(Date, nullable=False)
    split_ratio: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False)
    data_source: Mapped[str] = mapped_column(String(50), nullable=False)

    asset: Mapped["Asset"] = relationship(back_populates="stock_splits")

    __table_args__ = (
        UniqueConstraint("asset_id", "split_date", name="uq_stock_splits_asset_id"),
        Index("idx_stock_splits_asset_id", "asset_id"),
    )

    def __repr__(self) -> str:
        return f"StockSplit(asset_id={self.asset_id!r}, split_date={self.split_date!r})"
