"""Integration tests for the Educational AI system endpoints (Founder
Specification Part 2.7, Part 3.3.7, M6):
`POST/GET /api/v1/simulations/{id}/explanations` and
`POST /api/v1/simulations/{id}/explanations/questions`.

Exercises the full router -> service -> app.ai stack against the real DB via
the transactional `client` fixture. The default test configuration has
`AI_PROVIDER=none` (NullProvider), so most tests exercise the safe-fallback
path for free; a handful inject a `FakeProvider` via monkeypatching
`app.api.v1.services.explanation_service.get_ai_provider` to exercise the
success path deterministically, with no network call and no real API key.
"""

import uuid
from datetime import date

from app.ai.providers.base import ProviderResult
from app.ai.safety import REQUIRED_EXPLANATION_SECTIONS
from app.api.v1.dependencies import rate_limit_ai
from app.api.v1.errors import RateLimitExceededError
from app.api.v1.services import explanation_service
from app.main import app
from app.models import AuditLog
from app.models.enums import AuditEventType
from tests.simulation.conftest import make_asset, make_price


def _make_priced_asset(db_session) -> str:
    symbol = f"EXP{uuid.uuid4().hex[:8].upper()}"
    asset = make_asset(db_session, symbol=symbol, name="Explanation Test Co")
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    make_price(db_session, asset, date(2021, 1, 4), "120.00")
    db_session.flush()
    return symbol


def _create_completed_simulation(client, db_session) -> str:
    symbol = _make_priced_asset(db_session)
    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


class FakeProvider:
    name = "fake"

    def __init__(self, text: str, model_name: str = "fake-model-v1") -> None:
        self._text = text
        self.model_name = model_name
        self.call_count = 0

    def generate(self, *, system_prompt: str, user_content: str, max_tokens: int) -> ProviderResult:
        self.call_count += 1
        return ProviderResult(text=self._text, model_name=self.model_name)


def _valid_explanation_text() -> str:
    return "\n\n".join(
        f"## {name}\nEducational text about {name}." for name in REQUIRED_EXPLANATION_SECTIONS
    )


def _patch_provider(monkeypatch, provider) -> None:
    """Patches `get_ai_provider` to return `provider`, and `get_settings` so
    `_configured_model_name` reports the same model name the fake provider
    actually returns. In production these two always agree by construction
    (both derive from `Settings.ai_model_name`); a test that patches only
    the provider factory while leaving `ai_provider="none"` in settings would
    desync the pre-generation model-name placeholder used by the cache
    lookup from what the provider reports post-generation — a test-harness
    bug, not a production one, that surfaced exactly this way the first time
    this suite was written.
    """
    monkeypatch.setattr(explanation_service, "get_ai_provider", lambda settings: provider)
    fake_settings = _settings_with_caps(ai_provider="groq", ai_model_name=provider.model_name)
    monkeypatch.setattr(explanation_service, "get_settings", lambda: fake_settings)


# --- Explanation Engine -----------------------------------------------------


def test_create_explanation_with_no_provider_returns_safe_fallback(client, db_session):
    simulation_id = _create_completed_simulation(client, db_session)

    response = client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["generation_status"] == "failed"
    assert data["explanation_text"] is None
    assert data["error_message"] == explanation_service.SAFE_UNAVAILABLE_MESSAGE
    assert data["explanation_type"] == "initial"


def test_create_explanation_success_with_fake_provider(client, db_session, monkeypatch):
    provider = FakeProvider(_valid_explanation_text())
    _patch_provider(monkeypatch, provider)
    simulation_id = _create_completed_simulation(client, db_session)

    response = client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["generation_status"] == "completed"
    assert "## Summary" in data["explanation_text"]
    assert "Educational Disclaimer" in data["explanation_text"]
    assert data["model_name"] == "fake-model-v1"


def test_second_call_without_regenerate_is_served_from_cache(client, db_session, monkeypatch):
    provider = FakeProvider(_valid_explanation_text())
    _patch_provider(monkeypatch, provider)
    simulation_id = _create_completed_simulation(client, db_session)

    first = client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})
    second = client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})

    assert first.json()["data"]["id"] == second.json()["data"]["id"]
    assert provider.call_count == 1


def test_regenerate_true_calls_provider_again_and_creates_new_row(client, db_session, monkeypatch):
    provider = FakeProvider(_valid_explanation_text())
    _patch_provider(monkeypatch, provider)
    simulation_id = _create_completed_simulation(client, db_session)

    first = client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})
    second = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations", json={"regenerate": True}
    )

    assert first.json()["data"]["id"] != second.json()["data"]["id"]
    assert provider.call_count == 2


def test_regeneration_cap_returns_429(client, db_session, monkeypatch):
    provider = FakeProvider(_valid_explanation_text())
    _patch_provider(monkeypatch, provider)
    fake_settings = _settings_with_caps(max_explanation_regenerations=1)
    monkeypatch.setattr(explanation_service, "get_settings", lambda: fake_settings)
    simulation_id = _create_completed_simulation(client, db_session)

    client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})
    first_regen = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations", json={"regenerate": True}
    )
    second_regen = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations", json={"regenerate": True}
    )

    assert first_regen.status_code == 201
    assert second_regen.status_code == 429
    assert second_regen.json()["error"]["code"] == "REGENERATION_LIMIT_EXCEEDED"


def test_explanation_blocked_when_simulation_not_completed(client, db_session):
    symbol = f"EXP{uuid.uuid4().hex[:8].upper()}"
    asset = make_asset(db_session, symbol=symbol)
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    # No end-date price row -> MissingHistoricalDataError -> a persisted,
    # FAILED (not completed) Simulation row.
    db_session.flush()
    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )
    assert response.status_code == 422
    simulation_id = response.json()["error"]["simulation_id"]

    explanation_response = client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})

    assert explanation_response.status_code == 422
    assert explanation_response.json()["error"]["code"] == "SIMULATION_NOT_COMPLETED"


def test_explanation_for_unknown_simulation_returns_404(client, db_session):
    response = client.post(f"/api/v1/simulations/{uuid.uuid4()}/explanations", json={})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SIMULATION_NOT_FOUND"


def test_list_explanations_returns_all_attempts(client, db_session, monkeypatch):
    provider = FakeProvider(_valid_explanation_text())
    _patch_provider(monkeypatch, provider)
    simulation_id = _create_completed_simulation(client, db_session)

    client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})
    client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={"regenerate": True})

    response = client.get(f"/api/v1/simulations/{simulation_id}/explanations")

    assert response.status_code == 200
    assert len(response.json()["data"]) == 2


def test_explanation_audit_log_written_on_success(client, db_session, monkeypatch):
    provider = FakeProvider(_valid_explanation_text())
    _patch_provider(monkeypatch, provider)
    simulation_id = _create_completed_simulation(client, db_session)

    response = client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})
    explanation_id = response.json()["data"]["id"]

    logs = _ai_audit_logs_for(db_session, explanation_id)
    assert len(logs) == 1
    assert logs[0].event_type == AuditEventType.AI_EXPLANATION_GENERATED
    assert logs[0].details["simulation_id"] == simulation_id
    # The generated text itself must never leak into the audit trail.
    assert "explanation_text" not in logs[0].details
    assert "Summary" not in str(logs[0].details)


def test_explanation_audit_log_written_on_failure(client, db_session):
    simulation_id = _create_completed_simulation(client, db_session)

    response = client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})
    explanation_id = response.json()["data"]["id"]

    logs = _ai_audit_logs_for(db_session, explanation_id)
    assert len(logs) == 1
    assert logs[0].event_type == AuditEventType.AI_EXPLANATION_FAILED
    assert logs[0].details["error_type"] == "AIProviderUnavailableError"


def test_generation_failure_is_logged_with_the_real_exception_detail(client, db_session, caplog):
    """Regression test for the 2026-07-24 production incident: before this
    fix, a generation failure recorded only a bare exception *class* name in
    the (database-only) audit log and nothing at all to the application
    log — the actual failure reason was invisible everywhere. This asserts
    a real WARNING-level log record now exists and carries the exception's
    own message, not just its type."""
    simulation_id = _create_completed_simulation(client, db_session)

    with caplog.at_level("WARNING", logger="app.api.v1.services.explanation_service"):
        client.post(f"/api/v1/simulations/{simulation_id}/explanations", json={})

    matching = [r for r in caplog.records if "AI generation failed" in r.message]
    assert len(matching) == 1
    assert "AIProviderUnavailableError" in matching[0].message
    assert "AI_PROVIDER is set to 'none'" in matching[0].message


# --- Financial Tutor (follow-up questions) ----------------------------------


def test_followup_question_with_no_provider_returns_safe_fallback(client, db_session):
    simulation_id = _create_completed_simulation(client, db_session)

    response = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "Why is CAGR different from ROI?"},
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["generation_status"] == "failed"
    assert data["explanation_type"] == "follow_up"
    assert data["question_text"] == "Why is CAGR different from ROI?"


def test_followup_question_success_with_fake_provider(client, db_session, monkeypatch):
    provider = FakeProvider("CAGR annualizes returns; ROI does not account for time.")
    _patch_provider(monkeypatch, provider)
    simulation_id = _create_completed_simulation(client, db_session)

    response = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "Why is CAGR different from ROI?"},
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["generation_status"] == "completed"
    assert "CAGR annualizes returns" in data["explanation_text"]


def test_identical_followup_question_is_served_from_cache(client, db_session, monkeypatch):
    provider = FakeProvider("Dividend reinvestment means using dividends to buy more shares.")
    _patch_provider(monkeypatch, provider)
    simulation_id = _create_completed_simulation(client, db_session)

    first = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "What does dividend reinvestment mean?"},
    )
    second = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "  What   does dividend reinvestment mean?  "},
    )

    assert first.json()["data"]["id"] == second.json()["data"]["id"]
    assert provider.call_count == 1


def test_different_followup_questions_are_not_cached_together(client, db_session, monkeypatch):
    provider = FakeProvider("An answer.")
    _patch_provider(monkeypatch, provider)
    simulation_id = _create_completed_simulation(client, db_session)

    first = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "Why is CAGR different from ROI?"},
    )
    second = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "Why did inflation reduce final value?"},
    )

    assert first.json()["data"]["id"] != second.json()["data"]["id"]
    assert provider.call_count == 2


def test_followup_cap_returns_429(client, db_session, monkeypatch):
    provider = FakeProvider("An answer.")
    _patch_provider(monkeypatch, provider)
    fake_settings = _settings_with_caps(max_followup_questions=1)
    monkeypatch.setattr(explanation_service, "get_settings", lambda: fake_settings)
    simulation_id = _create_completed_simulation(client, db_session)

    first = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "First question?"},
    )
    second = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "Second, different question?"},
    )

    assert first.status_code == 201
    assert second.status_code == 429
    assert second.json()["error"]["code"] == "REGENERATION_LIMIT_EXCEEDED"


def test_followup_question_empty_string_is_rejected_by_validation(client, db_session):
    simulation_id = _create_completed_simulation(client, db_session)

    response = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": ""},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_followup_blocked_when_simulation_not_completed(client, db_session):
    symbol = f"EXP{uuid.uuid4().hex[:8].upper()}"
    asset = make_asset(db_session, symbol=symbol)
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    db_session.flush()
    create_response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )
    simulation_id = create_response.json()["error"]["simulation_id"]

    response = client.post(
        f"/api/v1/simulations/{simulation_id}/explanations/questions",
        json={"question": "Why did this fail?"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "SIMULATION_NOT_COMPLETED"


# --- Founder Decision 015: AI rate-limit friendly messaging ----------------


def test_ai_per_minute_limit_exceeded_returns_friendly_try_again_message(client, db_session):
    simulation_id = _create_completed_simulation(client, db_session)

    def _always_exceeded_minute():
        raise RateLimitExceededError(window="minute")

    app.dependency_overrides[rate_limit_ai] = _always_exceeded_minute
    try:
        response = client.post(
            f"/api/v1/simulations/{simulation_id}/explanations/questions",
            json={"question": "Why did dividends matter here?"},
        )
    finally:
        app.dependency_overrides[rate_limit_ai] = lambda: None

    assert response.status_code == 429
    body = response.json()["error"]
    assert body["code"] == "RATE_LIMIT_EXCEEDED"
    assert "try again" in body["message"].lower()
    assert "tomorrow" not in body["message"].lower()


def test_ai_daily_cap_exceeded_returns_friendly_come_back_tomorrow_message(client, db_session):
    """Founder Decision 015 clause 5: a daily cap must read as "come back
    tomorrow," never the per-minute bucket's "try again shortly" — the two
    are different situations and conflating them would be misleading."""
    simulation_id = _create_completed_simulation(client, db_session)

    def _always_exceeded_day():
        raise RateLimitExceededError(window="day")

    app.dependency_overrides[rate_limit_ai] = _always_exceeded_day
    try:
        response = client.post(
            f"/api/v1/simulations/{simulation_id}/explanations/questions",
            json={"question": "Why did dividends matter here?"},
        )
    finally:
        app.dependency_overrides[rate_limit_ai] = lambda: None

    assert response.status_code == 429
    body = response.json()["error"]
    assert body["code"] == "RATE_LIMIT_EXCEEDED"
    assert "tomorrow" in body["message"].lower()


# --- helpers -----------------------------------------------------------------


def _settings_with_caps(
    *,
    max_explanation_regenerations: int = 3,
    max_followup_questions: int = 10,
    ai_provider: str = "none",
    ai_model_name: str = "llama-3.1-8b-instant",
):
    from app.core.config import Settings

    return Settings(
        jwt_secret="test-secret",
        environment="test",
        ai_max_explanation_regenerations=max_explanation_regenerations,
        ai_max_followup_questions=max_followup_questions,
        ai_provider=ai_provider,
        groq_api_key="fake-key" if ai_provider != "none" else "",
        ai_model_name=ai_model_name,
    )


def _ai_audit_logs_for(db_session, explanation_id: str) -> list[AuditLog]:
    from sqlalchemy import select

    rows = (
        db_session.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "ai_explanation",
                AuditLog.entity_id == uuid.UUID(explanation_id),
            )
        )
        .scalars()
        .all()
    )
    return list(rows)
