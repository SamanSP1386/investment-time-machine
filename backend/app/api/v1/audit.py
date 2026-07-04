"""Audit Layer for the API surface: one `audit_logs` row per
`POST /api/v1/simulations` request, success or failure — Founder
Specification Part 2.8.14, mirroring the "one row per real attempt" pattern
already established for data imports (`app/ingestion/audit/recorder.py`,
ADR-014). Closes KI-026.

Reuses the existing `AuditEventType.SIMULATION_CREATED` value rather than
adding a `SIMULATION_FAILED` counterpart: `app/models/enums.py`'s own
docstring is explicit that "adding a value later is a migration... expand
deliberately, not speculatively," and a schema migration is out of scope for
this fix. `details.status` (`"succeeded"`/`"failed"`) and `details.error_code`
carry the outcome instead — every field the audit requirement asks for is
present, just not all promoted to top-level enum/column values.

A broken audit write must never block the simulation feature itself or turn
an otherwise-correct response into a 500 — mirrors the Redis rate-limiter's
fail-open policy (`app/core/rate_limit.py`) and the Founder Specification's
own AI-failure-isolation philosophy (Part 3.4.4), applied here by analogy to
a second, less-critical dependency. The write happens inside a SAVEPOINT
(`session.begin_nested()`) so a failure here rolls back only the audit
attempt, never the caller's own transaction.
"""

import logging
import uuid

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_session_factory
from app.core.request_id import get_request_id
from app.models import AuditLog
from app.models.enums import AuditEventType

logger = logging.getLogger(__name__)

SIMULATION_CREATE_PATH = "/api/v1/simulations"


def record_simulation_audit(
    session: Session,
    *,
    status: str,
    request_id: str,
    asset_symbol: str,
    simulation_id: uuid.UUID | None,
    error_code: str | None = None,
    user_id: uuid.UUID | None = None,
) -> None:
    """Records one audit attempt. Never raises: a failure here is logged and
    swallowed so it can't turn a real simulation result (or a real, already-
    classified error response) into an unrelated 500. Does not commit — the
    caller controls the transaction boundary (see `simulation_service`)."""
    entity_id = simulation_id if simulation_id is not None else uuid.uuid4()
    try:
        with session.begin_nested():
            session.add(
                AuditLog(
                    entity_type="simulation",
                    entity_id=entity_id,
                    event_type=AuditEventType.SIMULATION_CREATED,
                    user_id=user_id,
                    details={
                        "status": status,
                        "asset_symbol": asset_symbol,
                        "request_id": request_id,
                        "error_code": error_code,
                        "simulation_id": str(simulation_id) if simulation_id else None,
                    },
                )
            )
    except SQLAlchemyError as exc:
        logger.warning("failed to record simulation audit log: %s", exc)


def record_simulation_request_validation_audit(
    request: Request, exc: RequestValidationError
) -> None:
    """Pydantic-level request validation failures on
    `POST /api/v1/simulations` (malformed body, non-positive
    `investment_amount`, missing required fields) never reach
    `simulation_service.create_simulation` — FastAPI rejects the request
    before the endpoint function is called, so there is no request-scoped DB
    session to reuse. A short-lived session is opened directly for this one
    case only, per the "validation failure where possible" requirement."""
    if request.method != "POST" or request.url.path != SIMULATION_CREATE_PATH:
        return

    asset_symbol = "unknown"
    if isinstance(exc.body, dict):
        asset_symbol = exc.body.get("asset_symbol") or "unknown"

    session = get_session_factory()()
    try:
        record_simulation_audit(
            session,
            status="failed",
            request_id=get_request_id(request),
            asset_symbol=asset_symbol,
            simulation_id=None,
            error_code="VALIDATION_ERROR",
        )
        session.commit()
    finally:
        session.close()
