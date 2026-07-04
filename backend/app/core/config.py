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


@lru_cache
def get_settings() -> Settings:
    return Settings()
