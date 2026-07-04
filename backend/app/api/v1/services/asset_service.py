"""Read-only asset queries for the API layer (Founder Specification Part
3.3.5 Asset Search, 3.3.6 Asset Details). Deliberately separate from
`app.simulation.repository.SimulationRepository` (scoped to the Simulation
Engine's own needs) and `app.ingestion.storage.IngestionRepository`
(write-only) — each layer's data access stays independently reasoned about,
per `.claude/SYSTEM.md`.
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Asset, HistoricalPrice
from app.models.enums import AssetType


def search_assets(
    session: Session,
    query: str,
    asset_type: AssetType | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Asset], int]:
    """Case-insensitive partial match on symbol or name (Founder
    Specification 3.3.5: "Symbol, Asset name, Partial search term").
    Returns (page_of_results, total_matching_count) for pagination."""
    pattern = f"%{query}%"
    conditions = [(Asset.symbol.ilike(pattern)) | (Asset.name.ilike(pattern))]
    if asset_type is not None:
        conditions.append(Asset.asset_type == asset_type)

    total = session.execute(select(func.count()).select_from(Asset).where(*conditions)).scalar_one()

    assets = list(
        session.execute(
            select(Asset)
            .where(*conditions)
            .order_by(Asset.symbol.asc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return assets, total


def get_asset_by_symbol(session: Session, symbol: str) -> Asset | None:
    return session.execute(
        select(Asset).where(Asset.symbol == symbol.strip().upper())
    ).scalar_one_or_none()


def get_asset_availability(session: Session, symbol: str) -> tuple[date, date] | None:
    """Earliest/latest stored `price_date` for the asset. Returns `None` if
    the asset exists but has zero price rows (distinct from the asset not
    existing at all, which the caller checks separately via
    `get_asset_by_symbol`)."""
    asset = get_asset_by_symbol(session, symbol)
    if asset is None:
        return None

    result = session.execute(
        select(func.min(HistoricalPrice.price_date), func.max(HistoricalPrice.price_date)).where(
            HistoricalPrice.asset_id == asset.id
        )
    ).one()
    earliest, latest = result
    if earliest is None or latest is None:
        return None
    return earliest, latest
