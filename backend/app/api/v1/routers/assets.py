"""Asset search/lookup routes (Founder Specification Part 3.3.5, 3.3.6).
Public, read-only (Part 2.8.8). Thin handlers only — all querying happens in
`app.api.v1.services.asset_service`.
"""

from fastapi import APIRouter, Depends, Query

from app.api.v1.dependencies import get_db_session, rate_limit_read
from app.api.v1.schemas.assets import (
    AssetAvailability,
    AssetDetail,
    AssetSearchResponse,
    AssetSummary,
)
from app.api.v1.schemas.common import SuccessResponse
from app.api.v1.services import asset_service
from app.models.enums import AssetType
from app.simulation.exceptions import AssetNotFoundError

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get(
    "", response_model=SuccessResponse[AssetSearchResponse], dependencies=[Depends(rate_limit_read)]
)
def search_assets(
    query: str = Query(min_length=1),
    asset_type: AssetType | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session=Depends(get_db_session),
):
    assets, total = asset_service.search_assets(session, query, asset_type, limit, offset)
    summaries = [
        AssetSummary(symbol=a.symbol, name=a.name, asset_type=a.asset_type, currency=a.currency)
        for a in assets
    ]
    return SuccessResponse(data=AssetSearchResponse(assets=summaries, total=total))


@router.get(
    "/{symbol}",
    response_model=SuccessResponse[AssetDetail],
    dependencies=[Depends(rate_limit_read)],
)
def get_asset_detail(symbol: str, session=Depends(get_db_session)):
    asset = asset_service.get_asset_by_symbol(session, symbol)
    if asset is None:
        raise AssetNotFoundError(symbol)

    detail = AssetDetail(
        symbol=asset.symbol,
        name=asset.name,
        asset_type=asset.asset_type,
        currency=asset.currency,
        is_active=asset.is_active,
        data_source=asset.data_source,
        exchange=None,  # Founder Specification 3.3.6 output field; no column in M1 schema (KI-025)
    )
    return SuccessResponse(data=detail)


@router.get(
    "/{symbol}/availability",
    response_model=SuccessResponse[AssetAvailability],
    dependencies=[Depends(rate_limit_read)],
)
def get_asset_availability(symbol: str, session=Depends(get_db_session)):
    asset = asset_service.get_asset_by_symbol(session, symbol)
    if asset is None:
        raise AssetNotFoundError(symbol)

    availability = asset_service.get_asset_availability(session, symbol)
    if availability is None:
        raise AssetNotFoundError(symbol)  # asset exists, but has zero price rows

    earliest, latest = availability
    return SuccessResponse(
        data=AssetAvailability(
            symbol=asset.symbol,
            earliest_date=earliest,
            latest_date=latest,
            data_source=asset.data_source,
        )
    )
