"""Explicit ingestion error hierarchy. No layer in this package should catch
a bare `Exception` — every failure mode a provider or the database can
produce has its own named type here, so callers can react to specific
failures instead of guessing from a generic error message.
"""


class IngestionError(Exception):
    """Base for every error raised by the ingestion pipeline."""


# --- Provider Layer errors ---------------------------------------------------


class ProviderError(IngestionError):
    """Base for errors originating in the Provider Layer (communication only)."""


class ProviderUnavailableError(ProviderError):
    """The provider's service could not be reached at all (DNS, connection
    refused, 5xx after retries, etc.) — distinct from a timeout."""


class NetworkTimeoutError(ProviderError):
    """The provider was reachable but did not respond within the configured
    timeout (see Settings.ingestion_http_timeout_seconds)."""


class InvalidSymbolError(ProviderError):
    """The provider explicitly reported that the requested symbol/indicator
    code does not exist (e.g. yfinance returns an empty history for a
    delisted/invalid ticker, CoinGecko/FRED return a 404)."""

    def __init__(self, symbol: str, provider: str) -> None:
        self.symbol = symbol
        self.provider = provider
        super().__init__(f"{provider}: unknown symbol/indicator '{symbol}'")


class UnexpectedProviderResponseError(ProviderError):
    """The provider responded, but the response could not be parsed into the
    shape this adapter expects (schema drift, unexpected null, etc.) — this
    is a "the provider changed something" signal, not a data-quality issue."""


# --- Validation Layer errors --------------------------------------------------


class ValidationFailedError(IngestionError):
    """Raised when the caller asks validation to be strict (fail-fast) rather
    than collect-and-report. The pipeline itself does not raise this in
    normal operation — it collects per-record reasons into the Import Report
    instead — but it's available for callers/tests that want a hard failure."""

    def __init__(self, reasons: list[str]) -> None:
        self.reasons = reasons
        super().__init__(f"validation failed: {', '.join(reasons)}")


# --- Storage Layer errors -----------------------------------------------------


class DuplicateRecordError(IngestionError):
    """A record collides with data already stored, outside of the normal
    idempotent-upsert path (e.g. a constraint violation the repository layer
    did not anticipate). Ordinary duplicate re-imports are handled silently
    via ON CONFLICT DO NOTHING and reported as skipped, not raised."""


class DatabaseConstraintError(IngestionError):
    """A write was rejected by a database constraint other than the expected
    idempotency unique constraint (e.g. a NOT NULL violation from a bug
    upstream in normalization) — this should never happen in correct code and
    is treated as a hard failure, not a per-record rejection."""
