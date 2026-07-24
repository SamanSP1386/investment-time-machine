"""Live Groq integration tests — gated entirely behind a real `GROQ_API_KEY`
being present in the environment; skipped everywhere else (never run in CI,
never requires a key to exist for the rest of this test suite to pass).

This file exists specifically to close the gap the 2026-07-24 production
incident exposed: `tests/ai/test_providers.py` only ever exercises
`GroqProvider` against a monkeypatched `httpx.Client`, and every integration
test in `tests/api/test_explanations.py` only ever exercises `app.ai`
against a hand-written `FakeProvider` whose canned response text contains
zero digits — neither could ever catch a real mismatch between this
codebase and Groq's actual API/model behavior, including (as turned out to
be the real incident) the *safety gates* rejecting a real model's real
output for a reason no mocked text could ever trigger.

Run manually against a real key with:
    GROQ_API_KEY=<real key> pytest backend/tests/ai/test_groq_live.py -v

If `test_groq_followup_answer_passes_the_real_safety_gates` ever fails
again, the failure message *is* the production incident's actual root
cause, surfaced directly — this is the fastest way to reproduce and
diagnose a live "generation_status: failed" report without needing Render
log access at all.
"""

import os

import pytest

from app.ai.exceptions import AIError
from app.ai.providers.groq_provider import GroqProvider
from app.ai.service import generate_followup_answer

_GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
_MODEL_NAME = os.environ.get("AI_MODEL_NAME", "llama-3.1-8b-instant")

pytestmark = pytest.mark.skipif(
    not _GROQ_API_KEY,
    reason="GROQ_API_KEY not set — live Groq integration test skipped (see module docstring)",
)

# A realistic, complete `simulation_facts` payload — the exact shape
# `explanation_service._build_simulation_facts` constructs for a real
# completed simulation, not a simplified test stub. Deliberately includes a
# dividend-reinvestment scenario, since that is the exact question class the
# production incident's "Ask about this result" panel was asked.
_REALISTIC_SIMULATION_FACTS = {
    "asset_symbol": "AAPL",
    "investment_amount": "1000",
    "start_date": "2015-01-01",
    "end_date": "2025-01-01",
    "start_year": 2015,
    "end_year": 2025,
    "duration_years": 10.0,
    "include_dividends": True,
    "adjust_for_inflation": False,
    "initial_price": "100.00000000",
    "final_price": "250.00000000",
    "shares_purchased": "10.00000000",
    "final_value": "2500.00000000",
    "total_return_percentage": "150.000000",
    "cagr_percentage": "9.594448",
    "inflation_adjusted_final_value": None,
}


def _real_provider() -> GroqProvider:
    return GroqProvider(api_key=_GROQ_API_KEY, model_name=_MODEL_NAME, timeout_seconds=12.0)


def test_groq_provider_returns_a_real_completion():
    """The narrowest possible live check: does `GroqProvider` itself, talking
    to the real Groq API with the real request shape this codebase sends,
    get back a real completion? If this fails, the bug is in
    `GroqProvider`/config wiring — the request/response layer the incident
    asked to double-check first."""
    provider = _real_provider()

    result = provider.generate(
        system_prompt="You are a helpful assistant.",
        user_content="Reply with exactly one word: hello.",
        max_tokens=20,
    )

    assert result.text.strip() != ""
    assert result.model_name


def test_groq_followup_answer_passes_the_real_safety_gates():
    """The actual end-to-end path the AI panel exercises: a real Groq
    completion run through the real, unmocked `app.ai.safety` gates for a
    realistic follow-up question. If this raises, that exception (not a
    generic "failed" status) is the real production root cause."""
    provider = _real_provider()

    try:
        result = generate_followup_answer(
            _REALISTIC_SIMULATION_FACTS,
            "Why did dividends matter here?",
            provider=provider,
            max_tokens=800,
        )
    except AIError as exc:
        pytest.fail(
            f"A real Groq response was rejected by app.ai's own pipeline "
            f"({type(exc).__name__}: {exc}) — this is the production "
            f"incident's real root cause, not a mock artifact."
        )

    assert result.explanation_text
    assert "Educational Disclaimer" in result.explanation_text
