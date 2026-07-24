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
            raise httpx.HTTPStatusError(
                "error", request=request, response=httpx.Response(self.status_code, request=request)
            )

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
