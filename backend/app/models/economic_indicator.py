import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class EconomicIndicator(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Catalog of economic indicators (e.g. CPI, unemployment rate) sourced from
    FRED. This domain has no physical schema in the Founder Specification
    (Part 2.6.27 gap — see docs/KNOWN_ISSUES.md KI-005); this design mirrors the
    assets/historical_prices catalog-plus-time-series pattern deliberately,
    rather than folding indicators into the assets table, because indicators
    (CPI, unemployment) are not investable instruments and have a different
    identity shape (indicator_code, unit) than a tradable asset (symbol,
    asset_type). See docs/ARCHITECTURE_DECISIONS.md ADR-008."""

    __tablename__ = "economic_indicators"

    indicator_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    data_source: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    values: Mapped[list["EconomicIndicatorValue"]] = relationship(back_populates="indicator")

    def __repr__(self) -> str:
        return f"EconomicIndicator(indicator_code={self.indicator_code!r})"


class EconomicIndicatorValue(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Time series of observed values for an economic indicator (e.g. monthly
    CPI readings). Mirrors historical_prices' shape: identity FK + date +
    value + data_source, with the same triple-uniqueness idempotency guard."""

    __tablename__ = "economic_indicator_values"

    indicator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("economic_indicators.id"), nullable=False
    )
    observation_date: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    data_source: Mapped[str] = mapped_column(String(50), nullable=False)

    indicator: Mapped["EconomicIndicator"] = relationship(back_populates="values")

    __table_args__ = (
        UniqueConstraint(
            "indicator_id",
            "observation_date",
            "data_source",
            name="uq_economic_indicator_values_indicator_id",
        ),
        Index(
            "idx_economic_indicator_values_indicator_id_observation_date",
            "indicator_id",
            "observation_date",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"EconomicIndicatorValue(indicator_id={self.indicator_id!r}, "
            f"observation_date={self.observation_date!r})"
        )
