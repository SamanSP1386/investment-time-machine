"""Unit tests for `app.ai.service` orchestration (prompt -> provider ->
safety gates -> disclaimer). Uses an in-memory fake provider — no network,
no DB. Proves the three safety gates actually block generation (not just
that the check functions work in isolation, tested separately in
test_safety.py) and that the Educational Disclaimer is always code-appended,
never something the fake "model" was asked to produce.
"""

import pytest

from app.ai.exceptions import (
    AIIntegrityViolationError,
    AIOutputStructureError,
    AIUnsafeContentError,
)
from app.ai.providers.base import ProviderResult
from app.ai.safety import REQUIRED_EXPLANATION_SECTIONS
from app.ai.service import EDUCATIONAL_DISCLAIMER, generate_explanation, generate_followup_answer

SAMPLE_FACTS = {
    "asset_symbol": "AAPL",
    "investment_amount": "1000.00000000",
    "final_value": "2500.00000000",
    "cagr_percentage": "9.596872",
    "start_year": 2015,
    "end_year": 2025,
}


class FakeProvider:
    name = "fake"

    def __init__(self, text: str, model_name: str = "fake-model-v1") -> None:
        self._text = text
        self._model_name = model_name
        self.last_call: dict | None = None

    def generate(self, *, system_prompt: str, user_content: str, max_tokens: int) -> ProviderResult:
        self.last_call = {
            "system_prompt": system_prompt,
            "user_content": user_content,
            "max_tokens": max_tokens,
        }
        return ProviderResult(text=self._text, model_name=self._model_name)


def _valid_explanation_text() -> str:
    return "\n\n".join(
        f"## {name}\nSome educational text about {name}." for name in REQUIRED_EXPLANATION_SECTIONS
    )


def test_generate_explanation_success_appends_disclaimer_and_returns_model_name():
    provider = FakeProvider(_valid_explanation_text())

    result = generate_explanation(SAMPLE_FACTS, provider=provider, max_tokens=800)

    assert EDUCATIONAL_DISCLAIMER in result.explanation_text
    assert result.model_name == "fake-model-v1"
    assert provider.last_call["max_tokens"] == 800


def test_generate_explanation_never_asks_provider_to_write_disclaimer():
    provider = FakeProvider(_valid_explanation_text())
    generate_explanation(SAMPLE_FACTS, provider=provider, max_tokens=800)

    # The disclaimer is appended by code, not requested from the model as
    # content it must produce — it must only appear as an instruction not to
    # write one (see app/ai/prompt.py rule 6).
    assert "Educational Disclaimer" not in provider.last_call["user_content"]


def test_generate_explanation_rejects_missing_sections():
    provider = FakeProvider("## Summary\nToo short, missing every other section.")

    with pytest.raises(AIOutputStructureError):
        generate_explanation(SAMPLE_FACTS, provider=provider, max_tokens=800)


def test_generate_explanation_rejects_fabricated_numbers():
    text = _valid_explanation_text() + "\n\nYour actual return was an incredible 999999%."
    provider = FakeProvider(text)

    with pytest.raises(AIIntegrityViolationError):
        generate_explanation(SAMPLE_FACTS, provider=provider, max_tokens=800)


def test_generate_explanation_rejects_advice_language():
    text = _valid_explanation_text() + "\n\nYou should buy more shares right now."
    provider = FakeProvider(text)

    with pytest.raises(AIUnsafeContentError):
        generate_explanation(SAMPLE_FACTS, provider=provider, max_tokens=800)


def test_generate_followup_answer_success_appends_disclaimer():
    provider = FakeProvider("CAGR annualizes returns; ROI does not account for time.")

    result = generate_followup_answer(
        SAMPLE_FACTS, "Why is CAGR different from ROI?", provider=provider, max_tokens=400
    )

    assert EDUCATIONAL_DISCLAIMER in result.explanation_text


def test_generate_followup_answer_does_not_require_six_section_structure():
    # Follow-up answers are short conversational replies, not full reports —
    # the six-section structure check must not apply here.
    provider = FakeProvider("A short, direct answer with no section headers at all.")

    result = generate_followup_answer(
        SAMPLE_FACTS, "What does dividend reinvestment mean?", provider=provider, max_tokens=400
    )

    assert "A short, direct answer" in result.explanation_text


def test_generate_followup_answer_rejects_fabricated_numbers():
    provider = FakeProvider("Your true return was actually 12345%, far higher than reported.")

    with pytest.raises(AIIntegrityViolationError):
        generate_followup_answer(
            SAMPLE_FACTS, "Why did my return look low?", provider=provider, max_tokens=400
        )


def test_generate_followup_answer_rejects_advice_language():
    provider = FakeProvider("I recommend selling immediately based on this trend.")

    with pytest.raises(AIUnsafeContentError):
        generate_followup_answer(
            SAMPLE_FACTS, "What should I do next?", provider=provider, max_tokens=400
        )
