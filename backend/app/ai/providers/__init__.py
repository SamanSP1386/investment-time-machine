"""Factory selecting a concrete `AIProvider` from `Settings` — the only place
in the codebase that knows which providers exist. Router and service code
depends only on the `AIProvider` Protocol (`app.ai.providers.base`), never on
a vendor SDK directly (Founder Specification Part 2.7.15: provider-
independence via an abstraction layer, not a direct vendor dependency).
"""

from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.base import AIProvider, ProviderResult
from app.ai.providers.null_provider import NullProvider
from app.core.config import Settings


def get_ai_provider(settings: Settings) -> AIProvider:
    if settings.ai_provider == "anthropic":
        return AnthropicProvider(
            api_key=settings.ai_provider_api_key,
            model_name=settings.ai_model_name,
            timeout_seconds=settings.ai_request_timeout_seconds,
        )
    return NullProvider()


__all__ = ["AIProvider", "ProviderResult", "get_ai_provider"]
