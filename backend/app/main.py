from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.environment)

app = FastAPI(title=settings.app_name, version="0.1.0")


@app.get("/health")
def health_check() -> dict:
    return {"success": True, "data": {"status": "healthy"}}
