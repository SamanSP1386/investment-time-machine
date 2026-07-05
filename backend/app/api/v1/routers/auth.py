"""Identity Management routes: register/login/refresh/logout. Thin handlers
only — all business logic lives in `app.auth.service` via
`app.api.v1.services.auth_service`; this module validates the request
shape, calls the service layer, and translates the result into an HTTP
response plus cookies. Founder Specification Part 3.2.9 (Account Creation
Flow), 3.3.8 (Registration), 3.3.9 (Authentication).

Cookie strategy (approved Founder Decision): both the access token and the
refresh token are delivered exclusively via httpOnly, Secure,
SameSite=Strict cookies — never in a JSON response body — so no JavaScript
running on the frontend (including an XSS payload) can ever read either
token. The refresh-token cookie is scoped to this router's own path prefix
(`/api/v1/auth`) so it is never sent to, or exposed by, any other endpoint;
the access-token cookie is scoped to `/` since every authenticated route
needs it.
"""

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.v1.dependencies import get_db_session, rate_limit_auth
from app.api.v1.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserPublic
from app.api.v1.schemas.common import SuccessResponse
from app.api.v1.services import auth_service
from app.auth.exceptions import InvalidRefreshTokenError
from app.auth.service import IssuedSession
from app.core.config import get_settings
from app.core.request_id import get_request_id

router = APIRouter(prefix="/auth", tags=["auth"])

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"
REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth"


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _set_session_cookies(response: Response, issued: IssuedSession) -> None:
    settings = get_settings()
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        issued.access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path="/",
    )
    response.set_cookie(
        REFRESH_TOKEN_COOKIE,
        issued.refresh_token,
        max_age=settings.refresh_token_expire_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path=REFRESH_TOKEN_COOKIE_PATH,
    )


def _clear_session_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path=REFRESH_TOKEN_COOKIE_PATH)


@router.post(
    "/register",
    response_model=SuccessResponse[AuthResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_auth)],
)
def register(
    body: RegisterRequest,
    response: Response,
    http_request: Request,
    session=Depends(get_db_session),
):
    issued = auth_service.register(
        session,
        body,
        request_id=get_request_id(http_request),
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    _set_session_cookies(response, issued)
    return SuccessResponse(data=AuthResponse(user=UserPublic.from_user(issued.user)))


@router.post(
    "/login",
    response_model=SuccessResponse[AuthResponse],
    dependencies=[Depends(rate_limit_auth)],
)
def login(
    body: LoginRequest,
    response: Response,
    http_request: Request,
    session=Depends(get_db_session),
):
    issued = auth_service.login(
        session,
        body,
        request_id=get_request_id(http_request),
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    _set_session_cookies(response, issued)
    return SuccessResponse(data=AuthResponse(user=UserPublic.from_user(issued.user)))


@router.post(
    "/refresh",
    response_model=SuccessResponse[AuthResponse],
    dependencies=[Depends(rate_limit_auth)],
)
def refresh(
    response: Response,
    http_request: Request,
    session=Depends(get_db_session),
):
    raw_refresh_token = http_request.cookies.get(REFRESH_TOKEN_COOKIE)
    if raw_refresh_token is None:
        raise InvalidRefreshTokenError()

    issued = auth_service.refresh(
        session,
        raw_refresh_token,
        request_id=get_request_id(http_request),
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    _set_session_cookies(response, issued)
    return SuccessResponse(data=AuthResponse(user=UserPublic.from_user(issued.user)))


@router.post(
    "/logout",
    response_model=SuccessResponse[dict],
    dependencies=[Depends(rate_limit_auth)],
)
def logout(
    response: Response,
    http_request: Request,
    session=Depends(get_db_session),
):
    # Best-effort and always succeeds, even with a missing/invalid/already-
    # revoked cookie (see app.auth.service.logout) — a logout endpoint must
    # never leak whether a presented token was valid.
    raw_refresh_token = http_request.cookies.get(REFRESH_TOKEN_COOKIE)
    auth_service.logout(session, raw_refresh_token, request_id=get_request_id(http_request))
    _clear_session_cookies(response)
    return SuccessResponse(data={})
