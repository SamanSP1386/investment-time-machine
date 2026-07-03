import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, pg_enum
from app.models.enums import SimulationStatus

if TYPE_CHECKING:
    from app.models.ai_explanation import AIExplanation
    from app.models.asset import Asset
    from app.models.user import User


class Simulation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Every investment simulation the platform generates. Single-asset only at
    MVP. Anonymous simulations are allowed (user_id nullable).

    Approved fixes applied here (see docs/ARCHITECTURE_DECISIONS.md ADR-002,
    ADR-003):
    - calculation_version is present from this first migration, not deferred,
      so reproducibility can be enforced from day one even though reimports
      of historical data are otherwise permitted.
    - Output columns (initial_price, final_price, shares_purchased,
      final_value, total_return_percentage, cagr_percentage,
      inflation_adjusted_final_value) are nullable, because
      SimulationStatus.PENDING and FAILED are valid states in which no output
      exists yet. The Founder Specification's literal NOT NULL on these
      columns was an internal spec bug given its own status enum.
    """

    __tablename__ = "simulations"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False
    )

    # Inputs — always provided by the caller, never null.
    initial_investment_amount: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    dividends_reinvested: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    inflation_adjusted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    # Outputs — nullable; only populated once status = completed.
    initial_price: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    final_price: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    shares_purchased: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    final_value: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    total_return_percentage: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    cagr_percentage: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    inflation_adjusted_final_value: Mapped[float | None] = mapped_column(
        Numeric(20, 8), nullable=True
    )

    status: Mapped[SimulationStatus] = mapped_column(
        pg_enum(SimulationStatus, "simulation_status_enum"),
        nullable=False,
        server_default=SimulationStatus.PENDING.value,
    )
    calculation_version: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="v1"
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[Optional["User"]] = relationship(back_populates="simulations")
    asset: Mapped["Asset"] = relationship(back_populates="simulations")
    ai_explanations: Mapped[list["AIExplanation"]] = relationship(back_populates="simulation")

    def __repr__(self) -> str:
        return f"Simulation(asset_id={self.asset_id!r}, status={self.status!r})"
