from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, pg_enum
from app.models.enums import AssetType

if TYPE_CHECKING:
    from app.models.dividend import Dividend
    from app.models.historical_price import HistoricalPrice
    from app.models.simulation import Simulation
    from app.models.stock_split import StockSplit


class Asset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Master registry for every financial instrument the platform supports.
    All other market-data tables reference an asset by foreign key.

    Known MVP fragility (Founder Specification-acknowledged): global symbol
    uniqueness will not survive multi-exchange or international listings.
    Treat as an MVP-only assumption, not a permanent guarantee.
    """

    __tablename__ = "assets"

    symbol: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(
        pg_enum(AssetType, "asset_type_enum"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="USD")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    data_source: Mapped[str] = mapped_column(String(50), nullable=False)

    # Deliberately no delete cascade anywhere below: assets are deactivated
    # (is_active=False), never deleted, and historical data must never be
    # wiped as a side effect of an ORM-level delete. The DB-level FK
    # (default NO ACTION) will reject a delete while dependent rows exist.
    historical_prices: Mapped[list["HistoricalPrice"]] = relationship(back_populates="asset")
    dividends: Mapped[list["Dividend"]] = relationship(back_populates="asset")
    stock_splits: Mapped[list["StockSplit"]] = relationship(back_populates="asset")
    simulations: Mapped[list["Simulation"]] = relationship(back_populates="asset")

    __table_args__ = (Index("idx_assets_asset_type", "asset_type"),)

    def __repr__(self) -> str:
        return f"Asset(symbol={self.symbol!r}, asset_type={self.asset_type!r})"
