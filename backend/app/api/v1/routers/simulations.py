"""Simulation creation/retrieval routes (Founder Specification Part 3.3.2,
2.6.24). Thin handlers only — all calculation happens in
`app.simulation.engine`; this module only validates the request shape (via
Pydantic), calls the service layer, and maps the result to the response
envelope. See docs/api_design.md and docs/KNOWN_ISSUES.md KI-022 for the
public/optional-auth design (approved) and KI-023 (history endpoint
deferred to M5, not implemented here).
"""

import uuid

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.v1.dependencies import get_db_session, rate_limit_simulation
from app.api.v1.schemas.common import SuccessResponse
from app.api.v1.schemas.simulations import SimulationCreateRequest, SimulationResponse
from app.api.v1.services import simulation_service
from app.core.request_id import get_request_id

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post(
    "",
    response_model=SuccessResponse[SimulationResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_simulation)],
)
def create_simulation(
    request: SimulationCreateRequest,
    response: Response,
    http_request: Request,
    session=Depends(get_db_session),
):
    # Public for MVP, optionally authenticated later (approved design,
    # docs/KNOWN_ISSUES.md KI-022) — user_id is always None until M5 exists.
    user_id: uuid.UUID | None = None

    outcome, asset_symbol = simulation_service.create_simulation(
        session, request, request_id=get_request_id(http_request), user_id=user_id
    )

    body = SimulationResponse.from_simulation(
        outcome.simulation, asset_symbol, outcome.disclosed_splits, outcome.growth_series
    )
    response.headers["Location"] = f"/api/v1/simulations/{body.id}"
    return SuccessResponse(data=body)


@router.get("/{simulation_id}", response_model=SuccessResponse[SimulationResponse])
def get_simulation(simulation_id: uuid.UUID, session=Depends(get_db_session)):
    # requesting_user_id is always None until M5 exists (see get_simulation_by_id).
    simulation = simulation_service.get_simulation_by_id(
        session, simulation_id, requesting_user_id=None
    )
    body = SimulationResponse.from_simulation(simulation, simulation.asset.symbol)
    return SuccessResponse(data=body)
