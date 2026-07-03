import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.asset import Asset


class HistoricalPrice(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Daily market pricing data. The foundation of every simulation — the most
    frequently queried table in the platform.

    Both `close_price` and `adjusted_close_price` are stored. The Simulation
    Engine milestone MUST resolve which field feeds the growth formula before
    writing any calculation that also manually reinvests dividends — using
    adjusted_close while also reinvesting dividends double-counts them. See
    .claude/DATABASE_RULES.md.
    """

    __tablename__ = "historical_prices"

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False
    )
    price_date: Mapped[date] = mapped_column(Date, nullable=False)
    open_price: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    high_price: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    low_price: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    close_price: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    adjusted_close_price: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)
    data_source: Mapped[str] = mapped_column(String(50), nullable=False)

    asset: Mapped["Asset"] = relationship(back_populates="historical_prices")

    __table_args__ = (
        UniqueConstraint(
            "asset_id", "price_date", "data_source", name="uq_historical_prices_asset_id"
        ),
        # Composite (asset_id, price_date) serves both per-asset date-range
        # lookups AND plain asset_id lookups via its leading column, so a
        # separate standalone asset_id index would be redundant write overhead
        # at the ~50M-row scale this table is projected to reach.
        Index("idx_historical_prices_asset_id_price_date", "asset_id", "price_date"),
        Index("idx_historical_prices_price_date", "price_date"),
    )

    def __repr__(self) -> str:
        return f"HistoricalPrice(asset_id={self.asset_id!r}, price_date={self.price_date!r})"
