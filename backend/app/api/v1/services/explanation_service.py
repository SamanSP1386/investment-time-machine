"""API-layer service for the Educational AI system (Founder Specification
Part 2.7, M6). Owns everything `app.ai` is deliberately blind to: the
database session, the simulation ownership/completion checks, explanation
caching, the regeneration/follow-up caps, and audit logging — mirroring the
`simulation_service`/`auth_service` split established in M4/M5 exactly.

`app.ai` never sees a `Simulation` row, a `User`, or a database session —
`_build_simulation_facts` below is the *only* place that decides what
`app.ai` is allowed to see, and it is a strict allowlist (Founder
Specification Part 2.7.6/2.7.7 approved AI inputs, narrowed further by the M6
founder decision's explicit privacy rules): asset symbol, investment amount,
dates, simulation outputs, and dividend/inflation options. Email, display
name, user id, IP address, session id, request id, and auth information are
never constructed into this dict, let alone sent to a provider.

AI availability (Founder Specification Part 2.7.13): every generation
failure — provider unavailable, missing required sections, a fabricated
numeric value, or disallowed advice language — is caught here, recorded as a
FAILED row (with `explanation_text` left `NULL`, never partially populated),
and returned as a normal, successful HTTP response carrying that FAILED
status plus the literal safe fallback message. The simulation itself is
never affected; this module is never called from the simulation-creation
path at all.

Every failure is also logged at WARNING via the standard `logging` module
(`_log_generation_failure` below) — added after a real production incident
(2026-07-24) where `generation_status` was silently "failed" on every real
request with zero diagnostic signal anywhere: the pre-existing code recorded
only `type(exc).__name__` (a bare exception *class* name, e.g.
"AIIntegrityViolationError") in the `audit_logs` table, never the
exception's own message, and never anything to Render's actual application
logs at all — the M6 design review's own stated intent ("log, not block
silently, when the advice-language filter triggers, so this can be tuned
later") had never actually been implemented. The log line includes the
exception's message and, for the two safety-gate exception types, the
specific offending values/matched phrases that caused the rejection — this
is always safe to log: it is either the vendor's own error-response body
(never our outgoing request, never the API key — see
`app.ai.providers.groq_provider._safe_error_detail`'s own docstring for why)
or a fragment of the AI's own generated text, never a secret.
"""

import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.exceptions import (
    AIIntegrityViolationError,
    AIOutputStructureError,
    AIProviderUnavailableError,
    AIUnsafeContentError,
)
from app.ai.prompt import EXPLANATION_PROMPT_VERSION, FOLLOWUP_PROMPT_VERSION
from app.ai.providers import get_ai_provider
from app.ai.service import GenerationResult, generate_explanation, generate_followup_answer
from app.api.v1.audit import record_ai_audit
from app.api.v1.errors import (
    ForbiddenError,
    RegenerationCapExceededError,
    SimulationNotCompletedError,
    SimulationNotFoundError,
)
from app.core.config import get_settings
from app.models import AIExplanation, Simulation
from app.models.enums import AIExplanationType, AIGenerationStatus, AuditEventType, SimulationStatus

logger = logging.getLogger(__name__)

# Every exception type `app.ai` can raise is handled identically here: the
# attempt is recorded as FAILED and a safe, generic message is returned.
# Founder Specification Part 2.7.13 — AI failures must never prevent
# simulations (or, by direct extension, explanation requests) from
# completing the HTTP request successfully.
_GENERATION_ERRORS = (
    AIProviderUnavailableError,
    AIOutputStructureError,
    AIIntegrityViolationError,
    AIUnsafeContentError,
)

# Literal required text (M6 founder decision) — used for both the
# Explanation Engine and Financial Tutor failure paths. Deliberately the
# exact same string for both: inventing a second variant risks drifting from
# the one the founder approved.
SAFE_UNAVAILABLE_MESSAGE = (
    "Simulation completed successfully. AI explanation is temporarily unavailable. "
    "Your financial results remain accurate."
)


def _build_simulation_facts(simulation: Simulation, asset_symbol: str) -> dict:
    """The complete allowlist of what `app.ai` is ever allowed to see —
    intentionally exhaustive-looking so it's obvious at a glance what is
    *not* here (no email, display_name, user_id, ip_address, session_id,
    request_id, or any auth information). `start_year`/`end_year`/
    `duration_years` are supplied as plain numbers specifically so
    `app.ai.safety.check_numeric_integrity` can recognize a year or a
    duration the model mentions without it being flagged as fabricated."""
    duration_years = round((simulation.end_date - simulation.start_date).days / 365.25, 1)
    return {
        "asset_symbol": asset_symbol,
        "investment_amount": str(simulation.initial_investment_amount),
        "start_date": simulation.start_date.isoformat(),
        "end_date": simulation.end_date.isoformat(),
        "start_year": simulation.start_date.year,
        "end_year": simulation.end_date.year,
        "duration_years": duration_years,
        "include_dividends": simulation.dividends_reinvested,
        "adjust_for_inflation": simulation.inflation_adjusted,
        "initial_price": _decimal_or_none(simulation.initial_price),
        "final_price": _decimal_or_none(simulation.final_price),
        "shares_purchased": _decimal_or_none(simulation.shares_purchased),
        "final_value": _decimal_or_none(simulation.final_value),
        "total_return_percentage": _decimal_or_none(simulation.total_return_percentage),
        "cagr_percentage": _decimal_or_none(simulation.cagr_percentage),
        "inflation_adjusted_final_value": _decimal_or_none(
            simulation.inflation_adjusted_final_value
        ),
    }


def _decimal_or_none(value) -> str | None:
    return str(value) if value is not None else None


def _get_owned_completed_simulation(
    session: Session, simulation_id: uuid.UUID, requesting_user_id: uuid.UUID | None
) -> Simulation:
    simulation = session.get(Simulation, simulation_id)
    if simulation is None:
        raise SimulationNotFoundError(simulation_id)
    if simulation.user_id is not None and simulation.user_id != requesting_user_id:
        raise ForbiddenError()
    if simulation.status != SimulationStatus.COMPLETED:
        raise SimulationNotCompletedError(simulation_id)
    return simulation


def _find_cached(
    session: Session,
    simulation_id: uuid.UUID,
    *,
    explanation_type: AIExplanationType,
    model_name: str,
    prompt_version: str,
    question_text: str | None = None,
    only_completed: bool = False,
) -> AIExplanation | None:
    """Returns the most recent prior attempt for this exact (simulation,
    prompt_version, model_name[, question_text]) key.

    For the Explanation Engine (`only_completed=False`, the default): matches
    **regardless of status**, including a previously FAILED attempt. "Return
    the stored explanation instead of calling the model again" (M6 founder
    decision) means never re-spending a model call on an unchanged key
    unless the caller explicitly asks to regenerate — the regeneration cap,
    not this filter, is what bounds a retry-after-failure loop.

    For the Financial Tutor (`only_completed=True`): a follow-up question has
    no explicit "regenerate" override, so a transient failure must not be
    cached forever against that exact question text — only a genuinely
    successful prior answer is reused; a prior failure simply tries again
    (still bounded overall by the follow-up cap, since a fresh attempt is
    still one more row counted by `_count_attempts`).
    """
    stmt = (
        select(AIExplanation)
        .where(
            AIExplanation.simulation_id == simulation_id,
            AIExplanation.explanation_type == explanation_type,
            AIExplanation.model_name == model_name,
            AIExplanation.prompt_version == prompt_version,
        )
        .order_by(AIExplanation.created_at.desc())
    )
    if question_text is not None:
        stmt = stmt.where(AIExplanation.question_text == question_text)
    if only_completed:
        stmt = stmt.where(AIExplanation.generation_status == AIGenerationStatus.COMPLETED)
    return session.execute(stmt).scalars().first()


def _count_attempts(
    session: Session, simulation_id: uuid.UUID, explanation_type: AIExplanationType
) -> int:
    stmt = (
        select(func.count())
        .select_from(AIExplanation)
        .where(
            AIExplanation.simulation_id == simulation_id,
            AIExplanation.explanation_type == explanation_type,
        )
    )
    return session.execute(stmt).scalar_one()


def _configured_model_name(settings) -> str:
    return settings.ai_model_name if settings.ai_provider != "none" else "none"


def get_or_create_explanation(
    session: Session,
    simulation_id: uuid.UUID,
    *,
    regenerate: bool,
    requesting_user_id: uuid.UUID | None,
    request_id: str,
) -> AIExplanation:
    """Founder Specification Part 3.3.7 (Explanation Engine). Cost control
    (M6 design review §13/14): a cache hit (same simulation, prompt version,
    and configured model) short-circuits before any provider call and never
    counts against the regeneration cap; `regenerate=True` forces a fresh
    generation and does count."""
    simulation = _get_owned_completed_simulation(session, simulation_id, requesting_user_id)
    settings = get_settings()
    model_name = _configured_model_name(settings)

    if not regenerate:
        cached = _find_cached(
            session,
            simulation_id,
            explanation_type=AIExplanationType.INITIAL,
            model_name=model_name,
            prompt_version=EXPLANATION_PROMPT_VERSION,
        )
        if cached is not None:
            return cached

    if regenerate:
        # The first-ever generation (regenerate=False, no cache hit above) is
        # free and does not count against this cap — only explicit
        # regenerate=True calls do, so `ai_max_explanation_regenerations=3`
        # means exactly 3 regenerations are allowed on top of the original.
        existing_attempts = _count_attempts(session, simulation_id, AIExplanationType.INITIAL)
        if existing_attempts > settings.ai_max_explanation_regenerations:
            raise RegenerationCapExceededError(settings.ai_max_explanation_regenerations)

    facts = _build_simulation_facts(simulation, simulation.asset.symbol)
    row = AIExplanation(
        simulation_id=simulation_id,
        explanation_type=AIExplanationType.INITIAL,
        prompt_version=EXPLANATION_PROMPT_VERSION,
        model_name=model_name,
        input_summary=facts,
        generation_status=AIGenerationStatus.PENDING,
    )
    session.add(row)
    session.flush()

    try:
        provider = get_ai_provider(settings)
        result = generate_explanation(
            facts, provider=provider, max_tokens=settings.ai_max_output_tokens
        )
    except _GENERATION_ERRORS as exc:
        _mark_failed_and_audit(
            session,
            row,
            exc,
            simulation_id=simulation_id,
            requesting_user_id=requesting_user_id,
            request_id=request_id,
            extra_details={"type": "initial"},
        )
        return row

    _mark_completed_and_audit(
        session,
        row,
        result,
        simulation_id=simulation_id,
        requesting_user_id=requesting_user_id,
        request_id=request_id,
        extra_details={"type": "initial"},
    )
    return row


def ask_followup_question(
    session: Session,
    simulation_id: uuid.UUID,
    question: str,
    *,
    requesting_user_id: uuid.UUID | None,
    request_id: str,
) -> AIExplanation:
    """Financial Tutor (M6 approved scope). Follow-ups use only this one
    simulation's context — no long-term memory, no cross-user memory (each
    call rebuilds the prompt from scratch, see `app.ai.service`). An
    identical question (after whitespace normalization) against the same
    simulation is served from cache and never counts against the follow-up
    cap."""
    simulation = _get_owned_completed_simulation(session, simulation_id, requesting_user_id)
    settings = get_settings()
    model_name = _configured_model_name(settings)
    normalized_question = " ".join(question.strip().split())

    cached = _find_cached(
        session,
        simulation_id,
        explanation_type=AIExplanationType.FOLLOW_UP,
        model_name=model_name,
        prompt_version=FOLLOWUP_PROMPT_VERSION,
        question_text=normalized_question,
        only_completed=True,
    )
    if cached is not None:
        return cached

    existing_attempts = _count_attempts(session, simulation_id, AIExplanationType.FOLLOW_UP)
    if existing_attempts >= settings.ai_max_followup_questions:
        raise RegenerationCapExceededError(settings.ai_max_followup_questions)

    facts = _build_simulation_facts(simulation, simulation.asset.symbol)
    row = AIExplanation(
        simulation_id=simulation_id,
        explanation_type=AIExplanationType.FOLLOW_UP,
        question_text=normalized_question,
        prompt_version=FOLLOWUP_PROMPT_VERSION,
        model_name=model_name,
        input_summary=facts,
        generation_status=AIGenerationStatus.PENDING,
    )
    session.add(row)
    session.flush()

    try:
        provider = get_ai_provider(settings)
        result = generate_followup_answer(
            facts, normalized_question, provider=provider, max_tokens=settings.ai_max_output_tokens
        )
    except _GENERATION_ERRORS as exc:
        _mark_failed_and_audit(
            session,
            row,
            exc,
            simulation_id=simulation_id,
            requesting_user_id=requesting_user_id,
            request_id=request_id,
            extra_details={"type": "follow_up"},
        )
        return row

    _mark_completed_and_audit(
        session,
        row,
        result,
        simulation_id=simulation_id,
        requesting_user_id=requesting_user_id,
        request_id=request_id,
        extra_details={"type": "follow_up"},
    )
    return row


def list_explanations(
    session: Session, simulation_id: uuid.UUID, requesting_user_id: uuid.UUID | None
) -> list[AIExplanation]:
    _get_owned_completed_simulation(session, simulation_id, requesting_user_id)
    stmt = (
        select(AIExplanation)
        .where(AIExplanation.simulation_id == simulation_id)
        .order_by(AIExplanation.created_at.asc())
    )
    return list(session.execute(stmt).scalars().all())


def _log_generation_failure(
    exc: Exception, *, simulation_id: uuid.UUID, explanation_id: uuid.UUID, kind: str
) -> None:
    """The one place a real AI generation failure becomes visible outside
    the database (see this module's own docstring for the 2026-07-24
    incident this closes). `str(exc)` is always safe to log for every
    exception type raised anywhere in `app.ai`/`app.ai.providers`: a
    provider error is either the vendor's own error-response body (never
    our request, never the API key — confirmed directly against httpx's own
    exception formatting, and `GroqProvider` never constructs a message from
    request headers) or a JSON-shape mismatch detail; a safety-gate error's
    `offending_values`/`matched_phrases` are fragments of the AI's own
    generated text, never a secret. WARNING, not ERROR — an AI generation
    failure is an expected, handled outcome (Founder Specification Part
    2.7.13), not an application bug; it still needs to be visible, not
    silent."""
    logger.warning(
        "AI generation failed (kind=%s, simulation_id=%s, explanation_id=%s): %s: %s",
        kind,
        simulation_id,
        explanation_id,
        type(exc).__name__,
        exc,
    )


def _mark_failed_and_audit(
    session: Session,
    row: AIExplanation,
    exc: Exception,
    *,
    simulation_id: uuid.UUID,
    requesting_user_id: uuid.UUID | None,
    request_id: str,
    extra_details: dict,
) -> None:
    """`explanation_text` is left `NULL` — a rejected/unsafe generation is
    never persisted, even partially (M6: "do not return unsafe
    explanation")."""
    _log_generation_failure(
        exc,
        simulation_id=simulation_id,
        explanation_id=row.id,
        kind=extra_details.get("type", "unknown"),
    )
    row.generation_status = AIGenerationStatus.FAILED
    row.error_message = SAFE_UNAVAILABLE_MESSAGE
    session.commit()
    record_ai_audit(
        session,
        event_type=AuditEventType.AI_EXPLANATION_FAILED,
        explanation_id=row.id,
        simulation_id=simulation_id,
        user_id=requesting_user_id,
        request_id=request_id,
        details={"error_type": type(exc).__name__, **extra_details},
    )
    session.commit()


def _mark_completed_and_audit(
    session: Session,
    row: AIExplanation,
    result: GenerationResult,
    *,
    simulation_id: uuid.UUID,
    requesting_user_id: uuid.UUID | None,
    request_id: str,
    extra_details: dict,
) -> None:
    row.explanation_text = result.explanation_text
    row.model_name = result.model_name
    row.generation_status = AIGenerationStatus.COMPLETED
    session.commit()
    record_ai_audit(
        session,
        event_type=AuditEventType.AI_EXPLANATION_GENERATED,
        explanation_id=row.id,
        simulation_id=simulation_id,
        user_id=requesting_user_id,
        request_id=request_id,
        details={"model_name": result.model_name, **extra_details},
    )
    session.commit()
