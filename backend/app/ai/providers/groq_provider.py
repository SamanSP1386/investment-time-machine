"""Groq adapter — this project's configured AI provider as of Founder
Decision 019, which supersedes Founder Decision 003's original Anthropic
selection specifically on vendor choice (every other part of FD-003 —
privacy allowlist, prompt/safety gates, the `AIProvider` Protocol
abstraction itself, caching, integrity checks — is unchanged and unaffected).
Groq was adopted for M7 Phase 4 because this project's only deployment
target (Render free tier, docs/DEPLOYMENT.md) has no budget for a paid AI
vendor, and Groq's free tier is real and sufficient for this feature's
bounded, short-answer educational use case.

Talks to exactly one vendor's REST API and nothing else: no prompt
construction, no safety checks, no persistence (see
`app/ai/providers/base.py`'s module docstring for why that separation
matters). Groq exposes a plain OpenAI-compatible `/chat/completions`
endpoint and ships no first-party Python SDK requirement, so this adapter
talks to it directly via `httpx` (already a project dependency,
`backend/requirements.txt`) rather than adding a new SDK dependency for a
single HTTP call shape. Any request/response mapping specific to Groq's API
lives only in this file — nowhere else in the codebase talks to Groq
directly, so swapping or adding a provider never touches router or service
code.
"""

import httpx

from app.ai.exceptions import AIProviderUnavailableError
from app.ai.providers.base import ProviderResult

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class GroqProvider:
    name = "groq"

    def __init__(self, *, api_key: str, model_name: str, timeout_seconds: float) -> None:
        self._client = httpx.Client(
            base_url=_GROQ_BASE_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout_seconds,
        )
        self._model_name = model_name

    def generate(self, *, system_prompt: str, user_content: str, max_tokens: int) -> ProviderResult:
        try:
            response = self._client.post(
                "/chat/completions",
                json={
                    "model": self._model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "max_tokens": max_tokens,
                },
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AIProviderUnavailableError(f"Groq provider error: {exc}") from exc

        body = response.json()
        try:
            text = body["choices"][0]["message"]["content"] or ""
            model_name = body.get("model") or self._model_name
        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderUnavailableError(f"Groq response malformed: {exc}") from exc

        if not text:
            raise AIProviderUnavailableError("Groq response contained no text content")
        return ProviderResult(text=text, model_name=model_name)
