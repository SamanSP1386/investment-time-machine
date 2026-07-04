from datetime import date

from pydantic import BaseModel

from app.models.enums import AssetType


class AssetSummary(BaseModel):
    symbol: str
    name: str
    asset_type: AssetType
    currency: str


class AssetSearchResponse(BaseModel):
    assets: list[AssetSummary]
    total: int


class AssetDetail(BaseModel):
    symbol: str
    name: str
    asset_type: AssetType
    currency: str
    is_active: bool
    data_source: str
    # Founder Specification Part 3.3.6 lists "Exchange" as an output field;
    # the M1 `assets` table has no such column. Returned as null rather than
    # omitted, and tracked as a future schema enhancement (KI-025), not
    # silently dropped from the contract.
    exchange: str | None = None


class AssetAvailability(BaseModel):
    symbol: str
    earliest_date: date
    latest_date: date
    data_source: str
