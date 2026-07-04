"""Shared response envelope and Decimal-safe serialization, per
`.claude/API_STANDARDS.md` and `docs/api_design.md`. Every endpoint response
uses `SuccessResponse`/`ErrorResponse` — no endpoint returns a bare object.
"""

import uuid
from decimal import Decimal
from typing import Annotated, Generic, Literal, TypeVar

from pydantic import BaseModel, PlainSerializer

T = TypeVar("T")

# Every Decimal field serializes to a fixed-point string in JSON responses —
# never a JSON number — so a JavaScript client's `JSON.parse` (float64) can
# never silently lose precision on a financial value. Request bodies still
# accept a plain Decimal (pydantic-core parses JSON number/string tokens
# directly into Decimal without float intermediation), so this only governs
# the response direction, which is where the real precision-loss risk is.
DecimalStr = Annotated[
    Decimal,
    PlainSerializer(lambda v: format(v, "f"), return_type=str, when_used="json"),
]


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str
    simulation_id: uuid.UUID | None = None


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: ErrorDetail


class SuccessResponse(BaseModel, Generic[T]):
    success: Literal[True] = True
    data: T
