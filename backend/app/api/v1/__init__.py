from fastapi import APIRouter

from app.api.v1.routers import assets, auth, explanations, simulations

router = APIRouter()
router.include_router(auth.router)
router.include_router(assets.router)
router.include_router(simulations.router)
router.include_router(explanations.router)

__all__ = ["router"]
