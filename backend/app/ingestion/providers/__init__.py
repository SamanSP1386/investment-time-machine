from app.ingestion.providers.coingecko_provider import CoinGeckoProvider
from app.ingestion.providers.dev_seed_provider import DevSeedProvider
from app.ingestion.providers.fred_provider import FredProvider
from app.ingestion.providers.yfinance_provider import YFinanceProvider

_PROVIDERS = {
    "yfinance": YFinanceProvider,
    "coingecko": CoinGeckoProvider,
    "fred": FredProvider,
    # Local-development-only fixture provider (never real market data) — see
    # dev_seed_provider.py's module docstring. Refuses to construct outside
    # a development/test ENVIRONMENT.
    "dev_seed": DevSeedProvider,
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


__all__ = [
    "CoinGeckoProvider",
    "DevSeedProvider",
    "FredProvider",
    "YFinanceProvider",
    "get_provider",
]
