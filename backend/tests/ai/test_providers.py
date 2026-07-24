"""Unit tests for the provider abstraction (Founder Specification Part
2.7.15: provider-independence). `NullProvider` is tested for real (no
network); `GroqProvider` is tested against a monkeypatched `httpx.Client` so
this suite never makes a real network call or requires a real API key. The
factory (`app.ai.providers.get_ai_provider`) is tested for correct selection
based on `Settings.ai_provider`.
"""

import httpx
import pytest

from app.ai.exceptions import AIProviderUnavailableError
from app.ai.providers import get_ai_provider
from app.ai.providers.groq_provider import GroqProvider
from app.ai.providers.null_provider import NullProvider
from app.core.config import Settings


def test_null_provider_always_raises_provider_unavailable():
    provider = NullProvider()
    with pytest.raises(AIProviderUnavailableError):
        provider.generate(system_prompt="system", user_content="user", max_tokens=100)


def test_get_ai_provider_defaults_to_null_provider():
    settings = Settings(jwt_secret="test-secret", environment="test")
    provider = get_ai_provider(settings)
    assert isinstance(provider, NullProvider)


def test_get_ai_provider_selects_groq_when_configured():
    settings = Settings(
        jwt_secret="test-secret",
        environment="test",
        ai_provider="groq",
        groq_api_key="fake-key-for-construction-only",
    )
    provider = get_ai_provider(settings)
    assert isinstance(provider, GroqProvider)
    assert provider.name == "groq"


class _FakeResponse:
    def __init__(self, *, json_body: dict | None = None, status_code: int = 200) -> None:
        self._json_body = json_body or {}
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
            # A real httpx.Response, with a real JSON error body attached
            # (matching what Groq's actual API returns on a rejected
            # request) — `exc.response` needs a working `.json()` for
            # `_safe_error_detail` to read.
            real_response = httpx.Response(self.status_code, request=request, json=self._json_body)
            raise httpx.HTTPStatusError("error", request=request, response=real_response)

    def json(self) -> dict:
        return self._json_body


class _FakeGroqClient:
    def __init__(
        self, *, response: _FakeResponse | None = None, error: Exception | None = None
    ) -> None:
        self._response = response
        self._error = error

    def post(self, url, **kwargs):
        if self._error is not None:
            raise self._error
        return self._response


def _groq_success_body(text: str, model: str = "llama-3.1-8b-instant-resolved") -> dict:
    return {"choices": [{"message": {"content": text}}], "model": model}


def test_groq_provider_returns_text_and_model_on_success(monkeypatch):
    provider = GroqProvider(api_key="fake", model_name="llama-x", timeout_seconds=5.0)
    fake_client = _FakeGroqClient(
        response=_FakeResponse(json_body=_groq_success_body("Hello, this is an explanation."))
    )
    monkeypatch.setattr(provider, "_client", fake_client)

    result = provider.generate(system_prompt="sys", user_content="user", max_tokens=200)

    assert result.text == "Hello, this is an explanation."
    assert result.model_name == "llama-3.1-8b-instant-resolved"


def test_groq_provider_wraps_network_errors():
    provider = GroqProvider(api_key="fake", model_name="llama-x", timeout_seconds=5.0)
    fake_client = _FakeGroqClient(error=httpx.ConnectTimeout("timed out"))
    provider._client = fake_client

    with pytest.raises(AIProviderUnavailableError):
        provider.generate(system_prompt="sys", user_content="user", max_tokens=200)


def test_groq_provider_wraps_http_status_errors():
    provider = GroqProvider(api_key="fake", model_name="llama-x", timeout_seconds=5.0)
    fake_client = _FakeGroqClient(response=_FakeResponse(status_code=401))
    provider._client = fake_client

    with pytest.raises(AIProviderUnavailableError):
        provider.generate(system_prompt="sys", user_content="user", max_tokens=200)


def test_groq_provider_surfaces_the_real_error_body_on_http_status_error():
    """Regression test for the 2026-07-24 production incident: the original
    code called `response.raise_for_status()` and wrapped whatever httpx's
    own generic exception said, discarding Groq's own error-response body
    entirely — an "AIProviderUnavailableError" audit-logged with no way to
    tell an invalid key, a decommissioned model, and a rate limit apart.
    `_safe_error_detail` must now read that body and include it verbatim in
    the raised exception's message."""
    provider = GroqProvider(api_key="fake", model_name="llama-x", timeout_seconds=5.0)
    fake_client = _FakeGroqClient(
        response=_FakeResponse(
            status_code=401,
            json_body={"error": {"message": "Invalid API Key", "code": "invalid_api_key"}},
        )
    )
    provider._client = fake_client

    with pytest.raises(AIProviderUnavailableError) as exc_info:
        provider.generate(system_prompt="sys", user_content="user", max_tokens=200)

    assert "Invalid API Key" in str(exc_info.value)
    assert "invalid_api_key" in str(exc_info.value)
    assert "401" in str(exc_info.value)


def test_groq_provider_strips_whitespace_from_the_api_key():
    """Defensive hardening against a trailing newline/space in a
    copy-pasted dashboard secret — httpx itself already normalizes an
    embedded newline in a header value, but stripping at construction time
    means the header sent is provably clean regardless of httpx's own
    normalization behavior."""
    provider = GroqProvider(
        api_key="  fake-key-with-whitespace  \n", model_name="x", timeout_seconds=5.0
    )

    assert provider._client.headers["authorization"] == "Bearer fake-key-with-whitespace"


def test_groq_provider_raises_on_empty_text_response():
    provider = GroqProvider(api_key="fake", model_name="llama-x", timeout_seconds=5.0)
    fake_client = _FakeGroqClient(response=_FakeResponse(json_body=_groq_success_body("")))
    provider._client = fake_client

    with pytest.raises(AIProviderUnavailableError):
        provider.generate(system_prompt="sys", user_content="user", max_tokens=200)


def test_groq_provider_raises_on_malformed_response():
    provider = GroqProvider(api_key="fake", model_name="llama-x", timeout_seconds=5.0)
    fake_client = _FakeGroqClient(response=_FakeResponse(json_body={"unexpected": "shape"}))
    provider._client = fake_client

    with pytest.raises(AIProviderUnavailableError):
        provider.generate(system_prompt="sys", user_content="user", max_tokens=200)
