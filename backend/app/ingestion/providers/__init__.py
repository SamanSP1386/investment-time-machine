from app.ingestion.providers.coingecko_provider import CoinGeckoProvider
from app.ingestion.providers.fred_provider import FredProvider
from app.ingestion.providers.yfinance_provider import YFinanceProvider

_PROVIDERS = {
    "yfinance": YFinanceProvider,
    "coingecko": CoinGeckoProvider,
    "fred": FredProvider,
}


def get_provider(provider_name: str):
    """Resolve a provider by its `data_source` name. Adding a future provider
    (Polygon, Alpha Vantage, IEX, Bloomberg) means adding one entry here and
    one adapter module — nothing downstream (validation, normalization,
    storage, orchestrator) needs to change."""
    try:
        provider_cls = _PROVIDERS[provider_name]
    except KeyError:
        raise ValueError(
            f"Unknown provider '{provider_name}'. Known providers: {sorted(_PROVIDERS)}"
        ) from None
    return provider_cls()


__all__ = ["CoinGeckoProvider", "FredProvider", "YFinanceProvider", "get_provider"]
