"""Maps every named exception (Simulation Engine + API-layer) to the standard
error envelope (`app.api.v1.schemas.common.ErrorResponse`) and correct HTTP
status code, per docs/api_design.md's Error Design section and Founder
Specification Part 2.14.14. Each handler here is a documented, deliberate
mapping for one known error type — the single `Exception` handler at the
bottom is this project's one legitimate boundary-level catch-all (see
CLAUDE.md "no generic exception handling"): anything reaching it is an
unexpected bug, logged in full and returned to the client as a safe, generic
500 that leaks no internals beyond the request_id needed to look it up.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.v1.audit import record_simulation_request_validation_audit
from app.api.v1.errors import (
    ForbiddenError,
    RateLimitExceededError,
    SimulationNotFoundError,
    UnauthorizedError,
)
from app.api.v1.schemas.common import ErrorDetail, ErrorResponse
from app.auth.exceptions import (
    AccountInactiveError,
    AccountLockedError,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    WeakPasswordError,
)
from app.core.request_id import get_request_id
from app.simulation.exceptions import (
    AssetNotFoundError,
    CalculationError,
    InvalidDateRangeError,
    InvalidInvestmentAmountError,
    MissingHistoricalDataError,
)

logger = logging.getLogger(__name__)


def _envelope(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    simulation_id=None,
) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            request_id=get_request_id(request),
            simulation_id=simulation_id,
        )
    )
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AssetNotFoundError)
    def handle_asset_not_found(request: Request, exc: AssetNotFoundError) -> JSONResponse:
        return _envelope(request, status.HTTP_404_NOT_FOUND, "ASSET_NOT_FOUND", str(exc))

    @app.exception_handler(InvalidDateRangeError)
    def handle_invalid_date_range(request: Request, exc: InvalidDateRangeError) -> JSONResponse:
        return _envelope(
            request, status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_DATE_RANGE", str(exc)
        )

    @app.exception_handler(InvalidInvestmentAmountError)
    def handle_invalid_investment_amount(
        request: Request, exc: InvalidInvestmentAmountError
    ) -> JSONResponse:
        return _envelope(
            request, status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_INVESTMENT_AMOUNT", str(exc)
        )

    @app.exception_handler(MissingHistoricalDataError)
    def handle_missing_historical_data(
        request: Request, exc: MissingHistoricalDataError
    ) -> JSONResponse:
        return _envelope(
            request,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "MISSING_HISTORICAL_DATA",
            str(exc),
            simulation_id=exc.simulation_id,
        )

    @app.exception_handler(CalculationError)
    def handle_calculation_error(request: Request, exc: CalculationError) -> JSONResponse:
        logger.error(
            "Calculation error (request_id=%s): %s", get_request_id(request), exc, exc_info=True
        )
        return _envelope(
            request,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "CALCULATION_ERROR",
            "An internal error occurred while processing the simulation.",
            simulation_id=exc.simulation_id,
        )

    @app.exception_handler(SimulationNotFoundError)
    def handle_simulation_not_found(request: Request, exc: SimulationNotFoundError) -> JSONResponse:
        return _envelope(request, status.HTTP_404_NOT_FOUND, "SIMULATION_NOT_FOUND", str(exc))

    @app.exception_handler(ForbiddenError)
    def handle_forbidden(request: Request, exc: ForbiddenError) -> JSONResponse:
        return _envelope(
            request,
            status.HTTP_403_FORBIDDEN,
            "FORBIDDEN",
            "You do not have access to this resource.",
        )

    @app.exception_handler(RateLimitExceededError)
    def handle_rate_limit_exceeded(request: Request, exc: RateLimitExceededError) -> JSONResponse:
        return _envelope(
            request,
            status.HTTP_429_TOO_MANY_REQUESTS,
            "RATE_LIMIT_EXCEEDED",
            "Too many requests. Please try again later.",
        )

    @app.exception_handler(EmailAlreadyRegisteredError)
    def handle_email_already_registered(
        request: Request, exc: EmailAlreadyRegisteredError
    ) -> JSONResponse:
        return _envelope(request, status.HTTP_409_CONFLICT, "EMAIL_ALREADY_REGISTERED", str(exc))

    @app.exception_handler(WeakPasswordError)
    def handle_weak_password(request: Request, exc: WeakPasswordError) -> JSONResponse:
        return _envelope(request, status.HTTP_422_UNPROCESSABLE_ENTITY, "WEAK_PASSWORD", str(exc))

    @app.exception_handler(InvalidCredentialsError)
    def handle_invalid_credentials(request: Request, exc: InvalidCredentialsError) -> JSONResponse:
        return _envelope(request, status.HTTP_401_UNAUTHORIZED, "INVALID_CREDENTIALS", str(exc))

    @app.exception_handler(AccountLockedError)
    def handle_account_locked(request: Request, exc: AccountLockedError) -> JSONResponse:
        return _envelope(request, status.HTTP_429_TOO_MANY_REQUESTS, "ACCOUNT_LOCKED", str(exc))

    @app.exception_handler(AccountInactiveError)
    def handle_account_inactive(request: Request, exc: AccountInactiveError) -> JSONResponse:
        return _envelope(
            request,
            status.HTTP_403_FORBIDDEN,
            "ACCOUNT_INACTIVE",
            "This account is inactive.",
        )

    @app.exception_handler(InvalidRefreshTokenError)
    def handle_invalid_refresh_token(
        request: Request, exc: InvalidRefreshTokenError
    ) -> JSONResponse:
        # Also covers RefreshTokenReuseDetectedError (a subclass) via
        # Starlette's MRO-based handler lookup — deliberately the same
        # generic response for both, so reuse detection is never disclosed
        # to the caller (see app.auth.exceptions module docstring).
        return _envelope(request, status.HTTP_401_UNAUTHORIZED, "INVALID_REFRESH_TOKEN", str(exc))

    @app.exception_handler(UnauthorizedError)
    def handle_unauthorized(request: Request, exc: UnauthorizedError) -> JSONResponse:
        return _envelope(
            request,
            status.HTTP_401_UNAUTHORIZED,
            "UNAUTHORIZED",
            "Authentication is required to access this resource.",
        )

    @app.exception_handler(RequestValidationError)
    def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # KI-026: a Pydantic-level validation failure never reaches
        # simulation_service.create_simulation (FastAPI rejects the request
        # before the endpoint runs), so it's audited here, best-effort,
        # scoped to only POST /api/v1/simulations (see audit.py docstring).
        record_simulation_request_validation_audit(request, exc)
        return _envelope(
            request, status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", str(exc.errors())
        )

    @app.exception_handler(Exception)
    def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "Unhandled exception (request_id=%s): %s", get_request_id(request), exc, exc_info=True
        )
        return _envelope(
            request,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred.",
        )
