import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.api.v1.exception_handlers import register_exception_handlers
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.request_id import RequestIDMiddleware

settings = get_settings()
configure_logging(settings.environment)

logger = logging.getLogger(__name__)

if settings.redis_url:
    logger.info(
        "REDIS_URL is set — rate limiting and account lockout are Redis-backed "
        "(shared/persistent across instances)."
    )
else:
    logger.warning(
        "REDIS_URL is not set — rate limiting and account lockout are running in-process "
        "(app.core.rate_limit.InMemoryRateLimiter / app.auth.lockout.InMemoryAccountLockout). "
        "This is expected on a single-instance, Redis-less deployment (e.g. the Render free "
        "tier, see docs/DEPLOYMENT.md) but means counters are per-instance and reset on "
        "restart/redeploy — not a bug, a documented tradeoff of running without Redis."
    )

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
def health_check() -> dict:
    return {"success": True, "data": {"status": "healthy"}}


@app.get("/healthz")
def health_check_z() -> dict:
    """Identical to `/health` — `/healthz` is the conventional path name for
    a platform health-check probe (Render's `healthCheckPath`, `render.yaml`)
    and is offered alongside `/health` (kept for backward compatibility)
    rather than replacing it."""
    return {"success": True, "data": {"status": "healthy"}}
