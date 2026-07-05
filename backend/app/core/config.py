from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_JWT_SECRET = "changeme-dev-only-do-not-use-in-production"
_NON_PRODUCTION_ENVIRONMENTS = {"development", "test", "testing"}


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

    # Identity Management (Milestone 5) — every value below traces to an
    # approved Founder Decision from the M5 design review, not the Founder
    # Specification itself (which names JWT_SECRET as a required env var
    # but specifies no lifetime, rotation, or lockout parameters — see
    # docs/KNOWN_ISSUES.md KI-006).
    jwt_secret: str = "changeme-dev-only-do-not-use-in-production"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    rate_limit_auth_per_minute: int = 10
    account_lockout_max_attempts: int = 5
    account_lockout_window_minutes: int = 15
    # Approved Cookie Strategy is httpOnly+Secure+SameSite=Strict; this
    # toggle exists only so local HTTP (non-TLS) development doesn't
    # silently drop cookies the browser refuses to store — production must
    # never set this to false (see .env.example).
    cookie_secure: bool = True

    @model_validator(mode="after")
    def _reject_default_jwt_secret_outside_development(self) -> "Settings":
        """Red-team finding (M5): the placeholder `jwt_secret` default exists
        only so local development works with zero setup — matching this
        project's existing `database_url` convention (`itm_password`).
        Unlike a wrong database password (which just fails to connect), a
        forgotten `JWT_SECRET` in a real deployment is silently catastrophic:
        anyone can forge a valid access token for any user, including
        `is_admin: true`, since the signing key would be public knowledge.
        Fail loudly at startup instead of running insecurely."""
        if (
            self.environment not in _NON_PRODUCTION_ENVIRONMENTS
            and self.jwt_secret == _DEFAULT_JWT_SECRET
        ):
            raise ValueError(
                "JWT_SECRET must be set to a real, random value when ENVIRONMENT is not "
                f"one of {sorted(_NON_PRODUCTION_ENVIRONMENTS)} — refusing to start with the "
                "default development placeholder."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
