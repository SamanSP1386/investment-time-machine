"""Unit tests for the provider abstraction (Founder Specification Part
2.7.15: provider-independence). `NullProvider` is tested for real (no
network); `AnthropicProvider` is tested against a monkeypatched SDK client
so this suite never makes a real network call or requires a real API key.
The factory (`app.ai.providers.get_ai_provider`) is tested for correct
selection based on `Settings.ai_provider`.
"""

import pytest

from app.ai.exceptions import AIProviderUnavailableError
from app.ai.providers import get_ai_provider
from app.ai.providers.anthropic_provider import AnthropicProvider
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


def test_get_ai_provider_selects_anthropic_when_configured():
    settings = Settings(
        jwt_secret="test-secret",
        environment="test",
        ai_provider="anthropic",
        ai_provider_api_key="fake-key-for-construction-only",
    )
    provider = get_ai_provider(settings)
    assert isinstance(provider, AnthropicProvider)
    assert provider.name == "anthropic"


class _FakeTextBlock:
    type = "text"

    def __init__(self, text: str) -> None:
        self.text = text


class _FakeMessage:
    def __init__(self, text: str, model: str) -> None:
        self.content = [_FakeTextBlock(text)]
        self.model = model


class _FakeMessages:
    def __init__(self, response=None, error=None) -> None:
        self._response = response
        self._error = error

    def create(self, **kwargs):
        if self._error is not None:
            raise self._error
        return self._response


class _FakeAnthropicClient:
    def __init__(self, messages: _FakeMessages) -> None:
        self.messages = messages


def test_anthropic_provider_returns_text_and_model_on_success(monkeypatch):
    provider = AnthropicProvider(api_key="fake", model_name="claude-x", timeout_seconds=5.0)
    fake_client = _FakeAnthropicClient(
        _FakeMessages(response=_FakeMessage("Hello, this is an explanation.", "claude-x-resolved"))
    )
    monkeypatch.setattr(provider, "_client", fake_client)

    result = provider.generate(system_prompt="sys", user_content="user", max_tokens=200)

    assert result.text == "Hello, this is an explanation."
    assert result.model_name == "claude-x-resolved"


def test_anthropic_provider_wraps_sdk_errors():
    import anthropic

    provider = AnthropicProvider(api_key="fake", model_name="claude-x", timeout_seconds=5.0)
    error = anthropic.APIConnectionError(request=None)
    fake_client = _FakeAnthropicClient(_FakeMessages(error=error))
    provider._client = fake_client

    with pytest.raises(AIProviderUnavailableError):
        provider.generate(system_prompt="sys", user_content="user", max_tokens=200)


def test_anthropic_provider_raises_on_empty_text_response():
    provider = AnthropicProvider(api_key="fake", model_name="claude-x", timeout_seconds=5.0)
    fake_client = _FakeAnthropicClient(
        _FakeMessages(response=_FakeMessage("", "claude-x-resolved"))
    )
    provider._client = fake_client

    with pytest.raises(AIProviderUnavailableError):
        provider.generate(system_prompt="sys", user_content="user", max_tokens=200)
