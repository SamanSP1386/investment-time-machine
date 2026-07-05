"""Anthropic adapter — this project's first approved AI provider (Founder
Specification Part 2.7.15 names Anthropic as one of several acceptable
vendors; the M6 founder decision selects it as the first one implemented).

Talks to exactly one vendor's API and nothing else: no prompt construction,
no safety checks, no persistence (see `app/ai/providers/base.py`'s module
docstring for why that separation matters). Any request/response mapping
specific to Anthropic's SDK lives only in this file — nowhere else in the
codebase imports the `anthropic` package, so swapping or adding a provider
never touches router or service code.
"""

import anthropic

from app.ai.exceptions import AIProviderUnavailableError
from app.ai.providers.base import ProviderResult


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, *, api_key: str, model_name: str, timeout_seconds: float) -> None:
        self._client = anthropic.Anthropic(api_key=api_key, timeout=timeout_seconds)
        self._model_name = model_name

    def generate(self, *, system_prompt: str, user_content: str, max_tokens: int) -> ProviderResult:
        try:
            response = self._client.messages.create(
                model=self._model_name,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_content}],
            )
        except anthropic.AnthropicError as exc:
            raise AIProviderUnavailableError(f"Anthropic provider error: {exc}") from exc

        text = "".join(block.text for block in response.content if block.type == "text")
        if not text:
            raise AIProviderUnavailableError("Anthropic response contained no text content")
        return ProviderResult(text=text, model_name=response.model)
