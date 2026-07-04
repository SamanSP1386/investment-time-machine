from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration, populated from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Investment Time Machine"
    environment: str = "development"
    database_url: str = "postgresql://itm_user:itm_password@localhost:5432/itm_dev"
    cors_allowed_origins: str = "http://localhost:3000"

    # Data Ingestion (Milestone 2)
    fred_api_key: str = ""
    ingestion_http_timeout_seconds: float = 10.0

    # API Layer (Milestone 4) — Redis, deliberately excluded until a
    # milestone actually needed caching or rate limiting (ADR-004); this is
    # that milestone.
    redis_url: str = "redis://localhost:6379/0"
    rate_limit_simulation_per_minute: int = 60
    rate_limit_read_per_minute: int = 100


@lru_cache
def get_settings() -> Settings:
    return Settings()
