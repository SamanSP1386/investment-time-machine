"""Request/response schemas for the Educational AI system (Founder
Specification Part 2.7, Part 2.6.26, M6 design review). `explanation_text`
already contains the full six AI-generated sections plus the code-appended
Educational Disclaimer (`app.ai.service.EDUCATIONAL_DISCLAIMER`) as a single
block — the frontend renders it as plain/markdown text, never raw HTML (M6
red team review: AI output is untrusted display content).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AIExplanationType, AIGenerationStatus

if TYPE_CHECKING:
    from app.models import AIExplanation


class ExplanationRequest(BaseModel):
    regenerate: bool = False


class FollowUpQuestionRequest(BaseModel):
    """`question` is the first free-text, user-authored field the AI system
    ever sees. It is never concatenated into a system prompt — see
    `app.ai.prompt.build_followup_prompt` for the prompt-injection defense.
    The length cap keeps cost bounded and matches the "2-4 short paragraphs"
    answer style this feature is scoped to, not a long-form research query.
    """

    question: str = Field(min_length=1, max_length=500)


class ExplanationResponse(BaseModel):
    # `model_name` collides with Pydantic's own "model_*" protected namespace
    # (a BaseModel method prefix convention, unrelated to this field's
    # meaning: the AI model that generated the explanation) — silenced, not
    # worked around by renaming the field, since `model_name` is the exact
    # name Founder Specification Part 2.7.11 uses.
    model_config = ConfigDict(protected_namespaces=())

    id: uuid.UUID
    simulation_id: uuid.UUID
    explanation_type: AIExplanationType
    question_text: str | None
    explanation_text: str | None
    generation_status: AIGenerationStatus
    model_name: str
    prompt_version: str
    error_message: str | None
    created_at: datetime

    @classmethod
    def from_model(cls, row: AIExplanation) -> ExplanationResponse:
        """Pure data mapping (ORM -> API schema), matching the existing
        `SimulationResponse.from_simulation` convention — no ORM model is
        ever serialized directly."""
        return cls(
            id=row.id,
            simulation_id=row.simulation_id,
            explanation_type=row.explanation_type,
            question_text=row.question_text,
            explanation_text=row.explanation_text,
            generation_status=row.generation_status,
            model_name=row.model_name,
            prompt_version=row.prompt_version,
            error_message=row.error_message,
            created_at=row.created_at,
        )
