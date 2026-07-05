"""Always-fails-cleanly provider — selected when `AI_PROVIDER=none`, the
default outside explicit configuration. Makes Founder Specification
Principle 3 ("the platform must remain 100% functional with every AI
component removed") literally true rather than aspirational: no network
call, no API key required, and every caller already has a working failure
path for a provider that cannot generate (Part 2.7.13: AI failures must
never prevent simulations from completing).
"""

from app.ai.exceptions import AIProviderUnavailableError
from app.ai.providers.base import ProviderResult


class NullProvider:
    name = "none"

    def generate(self, *, system_prompt: str, user_content: str, max_tokens: int) -> ProviderResult:
        raise AIProviderUnavailableError("AI_PROVIDER is set to 'none' — no provider is configured")
