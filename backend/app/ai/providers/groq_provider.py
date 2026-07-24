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

# Bound how much of a vendor error body ever reaches a log line or an
# exception message — Groq's own error responses are small JSON objects in
# practice, but nothing here should ever forward an unbounded response body.
_ERROR_DETAIL_MAX_CHARS = 500


def _safe_error_detail(response: httpx.Response) -> str:
    """Extracts Groq's own error-body detail (e.g. `{"error": {"message":
    "Invalid API Key provided", "code": "invalid_api_key"}}`) for the
    exception message. This is the vendor's *response*, describing what it
    rejected and why — it never contains anything from our own outgoing
    request (the API key, headers, or prompt content), so it is always safe
    to log. Reading `response.json()` here is deliberate: `raise_for_status()`
    alone discards the response body entirely, silently downgrading a
    specific, actionable error ("model_decommissioned", "invalid_api_key",
    "rate_limit_exceeded") to a bare HTTP status code with no way to tell
    those apart later."""
    try:
        body = response.json()
    except ValueError:
        return response.text[:_ERROR_DETAIL_MAX_CHARS]
    detail = body.get("error", body) if isinstance(body, dict) else body
    return str(detail)[:_ERROR_DETAIL_MAX_CHARS]


class GroqProvider:
    name = "groq"

    def __init__(self, *, api_key: str, model_name: str, timeout_seconds: float) -> None:
        # `.strip()` guards against a trailing newline/space in a
        # copy-pasted dashboard secret — httpx itself already normalizes an
        # embedded newline in a header value (confirmed directly: it does
        # not raise and does not send the newline), so this is defensive
        # hardening against a real, common class of credential-entry bug,
        # not a fix for a proven failure mode in this codebase specifically.
        self._client = httpx.Client(
            base_url=_GROQ_BASE_URL,
            headers={"Authorization": f"Bearer {api_key.strip()}"},
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
        except httpx.HTTPStatusError as exc:
            # The one exception type here that has a response body worth
            # reading — every other httpx.HTTPError subtype (timeout,
            # connect error, protocol error) has no HTTP response to inspect.
            detail = _safe_error_detail(exc.response)
            raise AIProviderUnavailableError(
                f"Groq provider returned HTTP {exc.response.status_code}: {detail}"
            ) from exc
        except httpx.HTTPError as exc:
            raise AIProviderUnavailableError(f"Groq provider error: {exc}") from exc

        body = response.json()
        try:
            text = body["choices"][0]["message"]["content"] or ""
            model_name = body.get("model") or self._model_name
        except (KeyError, IndexError, TypeError) as exc:
            truncated_body = str(body)[:_ERROR_DETAIL_MAX_CHARS]
            raise AIProviderUnavailableError(
                f"Groq response malformed: {exc}; response body: {truncated_body}"
            ) from exc

        if not text:
            raise AIProviderUnavailableError("Groq response contained no text content")
        return ProviderResult(text=text, model_name=model_name)
