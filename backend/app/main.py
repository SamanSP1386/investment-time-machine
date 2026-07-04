from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.api.v1.exception_handlers import register_exception_handlers
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.request_id import RequestIDMiddleware

settings = get_settings()
configure_logging(settings.environment)

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
def health_check() -> dict:
    return {"success": True, "data": {"status": "healthy"}}
