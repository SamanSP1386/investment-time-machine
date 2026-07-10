from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from app.api.v1.schemas.common import DecimalStr
from app.models.enums import SimulationStatus

if TYPE_CHECKING:
    from app.models import Simulation, StockSplit
    from app.simulation.formulas import GrowthSeriesPoint as EngineGrowthSeriesPoint


class SimulationCreateRequest(BaseModel):
    """Field names deliberately match the Founder Specification's own
    vocabulary (Part 2.6.24: `include_dividends`, `adjust_for_inflation`),
    not the internal M1/M3 field names (`dividends_reinvested`,
    `inflation_adjusted`) — mapped explicitly in
    `app.api.v1.services.simulation_service`. See docs/KNOWN_ISSUES.md
    KI-024."""

    asset_symbol: str = Field(min_length=1)
    investment_amount: Decimal = Field(gt=0)
    start_date: date
    end_date: date
    include_dividends: bool = False
    adjust_for_inflation: bool = False


class DisclosedSplit(BaseModel):
    split_date: date
    split_ratio: DecimalStr


class GrowthSeriesPoint(BaseModel):
    point_date: date
    value: DecimalStr


class SimulationResponse(BaseModel):
    id: uuid.UUID
    status: SimulationStatus
    asset_symbol: str
    investment_amount: DecimalStr
    start_date: date
    end_date: date
    include_dividends: bool
    adjust_for_inflation: bool
    initial_price: DecimalStr | None
    final_price: DecimalStr | None
    shares_purchased: DecimalStr | None
    final_value: DecimalStr | None
    total_return_percentage: DecimalStr | None
    cagr_percentage: DecimalStr | None
    inflation_adjusted_final_value: DecimalStr | None
    disclosed_splits: list[DisclosedSplit]
    growth_series: list[GrowthSeriesPoint]
    calculation_version: str
    error_message: str | None
    created_at: datetime

    @classmethod
    def from_simulation(
        cls,
        simulation: Simulation,
        asset_symbol: str,
        disclosed_splits: tuple[StockSplit, ...] = (),
        growth_series: tuple[EngineGrowthSeriesPoint, ...] = (),
    ) -> SimulationResponse:
        """Pure data mapping (ORM + engine/repository output -> API schema) —
        no calculation happens here, matching "no financial calculation
        logic in the API layer." `disclosed_splits`/`growth_series` default
        to empty only for a caller that doesn't pass them; as of Founder
        Decision 014, both the `POST` (via `SimulationOutcome`) and `GET`
        (via `simulation_service.get_simulation_by_id`'s read-through) paths
        always pass real values for a completed simulation — see
        docs/KNOWN_ISSUES.md KI-021 (Resolved). `calculation_version`
        (Founder Decision 014, M7 Phase 3B) was already stored on every
        `Simulation` row from the first migration (`app.models.simulation`)
        but never surfaced on this response until now — a pure additive
        field exposure, no schema or engine change."""
        return cls(
            id=simulation.id,
            status=simulation.status,
            asset_symbol=asset_symbol,
            investment_amount=simulation.initial_investment_amount,
            start_date=simulation.start_date,
            end_date=simulation.end_date,
            include_dividends=simulation.dividends_reinvested,
            adjust_for_inflation=simulation.inflation_adjusted,
            initial_price=simulation.initial_price,
            final_price=simulation.final_price,
            shares_purchased=simulation.shares_purchased,
            final_value=simulation.final_value,
            total_return_percentage=simulation.total_return_percentage,
            cagr_percentage=simulation.cagr_percentage,
            inflation_adjusted_final_value=simulation.inflation_adjusted_final_value,
            calculation_version=simulation.calculation_version,
            disclosed_splits=[
                DisclosedSplit(split_date=s.split_date, split_ratio=s.split_ratio)
                for s in disclosed_splits
            ],
            growth_series=[
                GrowthSeriesPoint(point_date=p.point_date, value=p.value) for p in growth_series
            ],
            error_message=simulation.error_message,
            created_at=simulation.created_at,
        )
