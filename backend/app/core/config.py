from functools import lru_cache
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_JWT_SECRET = "changeme-dev-only-do-not-use-in-production"
_DEFAULT_DATABASE_URL = "postgresql://itm_user:itm_password@localhost:5432/itm_dev"
_DEFAULT_CORS_ORIGINS = "http://localhost:3000"
_NON_PRODUCTION_ENVIRONMENTS = {"development", "test", "testing"}
_LOCAL_DATABASE_HOSTNAMES = {"localhost", "127.0.0.1", "::1"}


def _is_local_placeholder_database_url(url: str) -> bool:
    """True for a `DATABASE_URL` that could not possibly be a real
    production database — empty/unparseable, or pointed at a loopback host.

    Deliberately NOT an exact-string match against `_DEFAULT_DATABASE_URL`.
    pydantic-settings resolves an unset field from a real environment
    variable (which outranks the Python field default) before ever falling
    back to that literal default — so a *different* local placeholder than
    the one exact default string can and does reach `Settings` unnoticed.
    Concretely, this is exactly how this guard's own CI regression happened:
    `.github/workflows/ci.yml`'s `lint-and-test` job sets a job-level
    `DATABASE_URL=postgresql://itm_user:itm_password@localhost:5432/itm_test`
    for its ephemeral Postgres service — same host, different database name
    — which a literal `== _DEFAULT_DATABASE_URL` check let straight through.
    Matching on the *host* instead catches every local/placeholder variant,
    not just the one string this module happens to default to.
    """
    if not url:
        return True
    try:
        hostname = urlparse(url).hostname
    except ValueError:
        return True
    return not hostname or hostname.lower() in _LOCAL_DATABASE_HOSTNAMES


class Settings(BaseSettings):
    """Central application configuration, populated from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Investment Time Machine"
    environment: str = "development"
    database_url: str = _DEFAULT_DATABASE_URL
    cors_allowed_origins: str = _DEFAULT_CORS_ORIGINS

    # Data Ingestion (Milestone 2)
    fred_api_key: str = ""
    ingestion_http_timeout_seconds: float = 10.0

    # API Layer (Milestone 4) — Redis, deliberately excluded until a
    # milestone actually needed caching or rate limiting (ADR-004). Milestone
    # 8 (Deployment) revisits this: Redis is OPTIONAL, not required — an
    # empty string (the default) means "no Redis configured," and every
    # Redis-backed component (`app.core.rate_limit`, `app.auth.lockout`)
    # falls back to an in-process, single-instance equivalent instead of
    # attempting a network connection at all (ADR-047). This is deliberately
    # a *different* fallback trigger than the existing per-call
    # fail-open-on-`RedisError` behavior below: an empty `REDIS_URL` is a
    # known, permanent condition (the Render free-tier deploy omits a Redis
    # add-on entirely) and should never pay a socket-connect-timeout on
    # every single request finding that out the hard way.
    redis_url: str = ""
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

    # Educational AI System (Milestone 6) — every value below traces to the
    # M6 design review's approved Founder Decisions, not the Founder
    # Specification itself (which names AI_PROVIDER_API_KEY as a required
    # env var and Anthropic as an acceptable provider, Part 2.7.15, but
    # specifies no model, token budget, cache/regeneration policy, or rate
    # limit beyond the generic "AI Endpoints: 20/min" in Part 2.8.13).
    # "none" is the default outside explicit configuration — selects
    # NullProvider, so the platform is 100% functional with AI unconfigured
    # (Founder Specification Principle 3), not just with it "removed" after
    # the fact.
    ai_provider: str = "none"  # "anthropic" | "none"
    ai_provider_api_key: str = ""
    ai_model_name: str = "claude-3-5-haiku-20241022"
    ai_max_output_tokens: int = 800
    ai_request_timeout_seconds: float = 12.0
    rate_limit_ai_per_minute: int = 20
    # Cost control (M6 design review §13/14): bounds how many times the
    # Explanation Engine's explanation may be regenerated, and how many
    # Financial Tutor follow-up questions may be asked, per simulation. A
    # cache hit (identical simulation_id + prompt_version + model_name, or
    # identical follow-up question text) never counts against either limit.
    ai_max_explanation_regenerations: int = 3
    ai_max_followup_questions: int = 10

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        """`CORS_ALLOWED_ORIGINS` accepts a comma-separated list (not just a
        single hardcoded origin) so local dev survives Next.js port drift
        (e.g. `http://localhost:3000,http://localhost:3001`) and so a real
        deployment can list both a Vercel production domain and its preview
        domains. Blank entries (a stray trailing comma, or the var being set
        to an empty string) are dropped rather than passed through as a
        literal empty-string origin, which would never match a real request
        and would silently look like "CORS is configured" while blocking
        everything."""
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def _reject_ai_provider_configured_without_api_key(self) -> "Settings":
        """Mirrors the JWT-secret startup guard below: a real provider
        selected with no API key would fail on the first request, in
        production, with no warning anyone would see until a user hits it.
        Fail loudly at startup instead."""
        if self.ai_provider not in {"none", "anthropic"}:
            raise ValueError(
                f"AI_PROVIDER must be one of 'none' or 'anthropic', got {self.ai_provider!r}."
            )
        if self.ai_provider != "none" and not self.ai_provider_api_key:
            raise ValueError(
                f"AI_PROVIDER is set to {self.ai_provider!r} but AI_PROVIDER_API_KEY is empty — "
                "refusing to start with a provider that cannot authenticate."
            )
        return self

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

    @model_validator(mode="after")
    def _reject_dev_defaults_outside_development(self) -> "Settings":
        """Production config discipline (KI-046): a real deployment left
        pointed at a local placeholder fails obviously (wrong DB host, no
        browser origin can call the API) rather than catastrophically like a
        forgotten `JWT_SECRET` — but "obviously broken in production,
        silently fine in every local/CI check" is exactly the class of gap
        KI-046 asks this project to close by construction, not by
        remembering. Mirrors the JWT-secret guard above for the two other
        values a deploy must always override, plus the cookie flag that must
        never be relaxed outside development."""
        if self.environment not in _NON_PRODUCTION_ENVIRONMENTS:
            if _is_local_placeholder_database_url(self.database_url):
                raise ValueError(
                    "DATABASE_URL must be set to the real database when ENVIRONMENT is not one "
                    f"of {sorted(_NON_PRODUCTION_ENVIRONMENTS)} — refusing to start pointed at a "
                    "local/loopback or missing database host."
                )
            if self.cors_allowed_origins == _DEFAULT_CORS_ORIGINS:
                raise ValueError(
                    "CORS_ALLOWED_ORIGINS must be set to the real deployed frontend origin(s) "
                    f"when ENVIRONMENT is not one of {sorted(_NON_PRODUCTION_ENVIRONMENTS)} — "
                    "refusing to start with the local development placeholder (no real browser "
                    "origin would be allowed to call this API)."
                )
            if not self.cookie_secure:
                raise ValueError(
                    "COOKIE_SECURE must be true when ENVIRONMENT is not one of "
                    f"{sorted(_NON_PRODUCTION_ENVIRONMENTS)} — a non-Secure cookie must never be "
                    "issued outside local, non-TLS development."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
