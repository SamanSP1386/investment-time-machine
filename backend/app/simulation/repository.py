"""Read-only data access for the Simulation Engine. Deliberately separate
from `app.ingestion.storage.IngestionRepository` (which is write-only, for
imports) — the Simulation Engine never writes market data, only reads
already-validated rows and writes its own `simulations` result row. This
keeps the two milestones' database access independently reasoned about, per
`.claude/SYSTEM.md`'s service-boundary philosophy.
"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Asset,
    Dividend,
    EconomicIndicator,
    EconomicIndicatorValue,
    HistoricalPrice,
    StockSplit,
)


class SimulationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_asset_by_symbol(self, symbol: str) -> Asset | None:
        return self._session.execute(
            select(Asset).where(Asset.symbol == symbol)
        ).scalar_one_or_none()

    def get_price_on_date(self, asset_id: uuid.UUID, target_date: date) -> HistoricalPrice | None:
        """Exact-date lookup only — never the nearest trading day (see
        `docs/simulation_formulas.md` §6, KI-017). Absence of a row here is
        exactly the condition that produces a controlled
        MissingHistoricalDataError, never a fabricated or substituted price."""
        return self._session.execute(
            select(HistoricalPrice).where(
                HistoricalPrice.asset_id == asset_id,
                HistoricalPrice.price_date == target_date,
            )
        ).scalar_one_or_none()

    def get_prices_ordered(
        self, asset_id: uuid.UUID, start_date: date, end_date: date
    ) -> list[HistoricalPrice]:
        """All price rows in [start_date, end_date], ordered ascending.
        Added in M4 to support `growth_series` (Founder Specification
        Part 3.3.2's required "Growth Chart" output) — the core
        shares/final_value calculation (M3) only ever needs the two exact
        endpoint rows via `get_price_on_date`; this range query exists only
        for the value-over-time series, a distinct, read-only concern."""
        return list(
            self._session.execute(
                select(HistoricalPrice)
                .where(
                    HistoricalPrice.asset_id == asset_id,
                    HistoricalPrice.price_date >= start_date,
                    HistoricalPrice.price_date <= end_date,
                )
                .order_by(HistoricalPrice.price_date.asc())
            )
            .scalars()
            .all()
        )

    def get_dividends_ordered(
        self, asset_id: uuid.UUID, start_date: date, end_date: date
    ) -> list[Dividend]:
        """Ordered strictly ascending by ex_dividend_date — the Simulation
        Engine's dividend-reinvestment loop depends on this ordering to
        compound correctly (each event's cash dividend is calculated against
        the share count produced by every earlier event, never the reverse).
        Range is (start_date, end_date]: a dividend paid exactly on the
        purchase date wasn't earned by this simulated position; one paid
        exactly on the exit date still is."""
        return list(
            self._session.execute(
                select(Dividend)
                .where(
                    Dividend.asset_id == asset_id,
                    Dividend.ex_dividend_date > start_date,
                    Dividend.ex_dividend_date <= end_date,
                )
                .order_by(Dividend.ex_dividend_date.asc())
            )
            .scalars()
            .all()
        )

    def get_splits_ordered(
        self, asset_id: uuid.UUID, start_date: date, end_date: date
    ) -> list[StockSplit]:
        """Audit/disclosure only (Founder Decision 001) — never read by any
        calculation. Range is inclusive on both ends since a split disclosed
        to the user is purely informational, not a boundary condition that
        needs the same care as a cash-flow event."""
        return list(
            self._session.execute(
                select(StockSplit)
                .where(
                    StockSplit.asset_id == asset_id,
                    StockSplit.split_date >= start_date,
                    StockSplit.split_date <= end_date,
                )
                .order_by(StockSplit.split_date.asc())
            )
            .scalars()
            .all()
        )

    def get_latest_cpi_on_or_before(
        self, indicator_code: str, target_date: date
    ) -> EconomicIndicatorValue | None:
        """As-of lookup: the most recent real, observed CPI reading on or
        before `target_date` — never interpolated (see
        `docs/simulation_formulas.md` §5). `None` means a genuine data gap,
        which the engine treats as "inflation adjustment unavailable"
        (Founder Specification 3.3.4), not a hard failure."""
        indicator = self._session.execute(
            select(EconomicIndicator).where(EconomicIndicator.indicator_code == indicator_code)
        ).scalar_one_or_none()
        if indicator is None:
            return None

        return self._session.execute(
            select(EconomicIndicatorValue)
            .where(
                EconomicIndicatorValue.indicator_id == indicator.id,
                EconomicIndicatorValue.observation_date <= target_date,
            )
            .order_by(EconomicIndicatorValue.observation_date.desc())
            .limit(1)
        ).scalar_one_or_none()
