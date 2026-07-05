"""Educational AI routes (Founder Specification Part 2.7, Part 3.3.7, M6).
Thin handlers only: ownership/completion checks, caching, regeneration caps,
and audit logging all live in `app.api.v1.services.explanation_service`; no
AI provider call or safety check happens in this module.

Every route here returns `200`/`201` on a *successful HTTP request* even
when the AI generation itself failed — the response body's
`generation_status` field is `"failed"` in that case, carrying the literal
safe fallback message in `error_message` (Founder Specification Part 2.7.13:
AI failures must never surface as an error response; see
`explanation_service.SAFE_UNAVAILABLE_MESSAGE`).
"""

import uuid

from fastapi import APIRouter, Depends, Request, status

from app.api.v1.dependencies import get_current_user_optional, get_db_session, rate_limit_ai
from app.api.v1.schemas.common import SuccessResponse
from app.api.v1.schemas.explanations import (
    ExplanationRequest,
    ExplanationResponse,
    FollowUpQuestionRequest,
)
from app.api.v1.services import explanation_service
from app.core.request_id import get_request_id
from app.models import User

router = APIRouter(prefix="/simulations/{simulation_id}/explanations", tags=["explanations"])


@router.post(
    "",
    response_model=SuccessResponse[ExplanationResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_ai)],
)
def create_or_get_explanation(
    simulation_id: uuid.UUID,
    request: ExplanationRequest,
    http_request: Request,
    session=Depends(get_db_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    requesting_user_id = current_user.id if current_user is not None else None
    row = explanation_service.get_or_create_explanation(
        session,
        simulation_id,
        regenerate=request.regenerate,
        requesting_user_id=requesting_user_id,
        request_id=get_request_id(http_request),
    )
    return SuccessResponse(data=ExplanationResponse.from_model(row))


@router.get("", response_model=SuccessResponse[list[ExplanationResponse]])
def list_explanations(
    simulation_id: uuid.UUID,
    session=Depends(get_db_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    requesting_user_id = current_user.id if current_user is not None else None
    rows = explanation_service.list_explanations(session, simulation_id, requesting_user_id)
    return SuccessResponse(data=[ExplanationResponse.from_model(row) for row in rows])


@router.post(
    "/questions",
    response_model=SuccessResponse[ExplanationResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_ai)],
)
def ask_followup_question(
    simulation_id: uuid.UUID,
    request: FollowUpQuestionRequest,
    http_request: Request,
    session=Depends(get_db_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    requesting_user_id = current_user.id if current_user is not None else None
    row = explanation_service.ask_followup_question(
        session,
        simulation_id,
        request.question,
        requesting_user_id=requesting_user_id,
        request_id=get_request_id(http_request),
    )
    return SuccessResponse(data=ExplanationResponse.from_model(row))
