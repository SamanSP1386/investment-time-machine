"""All SQLAlchemy models must be imported here so Base.metadata is complete
for Alembic autogenerate/compare and for Base.metadata.create_all in tests."""

from app.models.ai_explanation import AIExplanation
from app.models.asset import Asset
from app.models.audit_log import AuditLog
from app.models.base import Base
from app.models.dividend import Dividend
from app.models.economic_indicator import EconomicIndicator, EconomicIndicatorValue
from app.models.historical_price import HistoricalPrice
from app.models.refresh_token import RefreshToken
from app.models.simulation import Simulation
from app.models.stock_split import StockSplit
from app.models.user import User

__all__ = [
    "Base",
    "Asset",
    "HistoricalPrice",
    "Dividend",
    "StockSplit",
    "EconomicIndicator",
    "EconomicIndicatorValue",
    "User",
    "RefreshToken",
    "Simulation",
    "AuditLog",
    "AIExplanation",
]
