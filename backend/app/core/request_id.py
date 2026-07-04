"""Request-ID middleware: every request gets a UUID, available to exception
handlers (for log correlation in error responses) and echoed back as an
`X-Request-ID` response header. Satisfies Founder Specification Part
2.12.12's "errors must be actionable" without leaking internal detail to the
client — the client gets a safe generic message plus this ID; full detail
goes only to structured logs.
"""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")
