import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.asset import Asset


class Dividend(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Cash distributions paid by an asset. Kept separate from historical_prices
    because dividends are a distinct financial event required for dividend
    reinvestment simulation and dividend-contribution analytics."""

    __tablename__ = "dividends"

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False
    )
    ex_dividend_date: Mapped[date] = mapped_column(Date, nullable=False)
    dividend_amount: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="USD")
    data_source: Mapped[str] = mapped_column(String(50), nullable=False)

    asset: Mapped["Asset"] = relationship(back_populates="dividends")

    __table_args__ = (
        UniqueConstraint(
            "asset_id",
            "ex_dividend_date",
            "dividend_amount",
            name="uq_dividends_asset_id",
        ),
        Index("idx_dividends_asset_id", "asset_id"),
    )

    def __repr__(self) -> str:
        return f"Dividend(asset_id={self.asset_id!r}, ex_dividend_date={self.ex_dividend_date!r})"
