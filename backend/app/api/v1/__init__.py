from fastapi import APIRouter

from app.api.v1.routers import assets, simulations

router = APIRouter()
router.include_router(assets.router)
router.include_router(simulations.router)

__all__ = ["router"]
