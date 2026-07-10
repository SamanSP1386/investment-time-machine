"""Simulation creation/retrieval routes (Founder Specification Part 3.3.2,
2.6.24). Thin handlers only — all calculation happens in
`app.simulation.engine`; this module only validates the request shape (via
Pydantic), calls the service layer, and maps the result to the response
envelope. See docs/api_design.md and docs/KNOWN_ISSUES.md KI-022 for the
public/optional-auth design (approved) and KI-023 (history endpoint still
deferred — M5 implements the auth *middleware*, not the history listing
endpoint itself).

M5 update: anonymous simulations remain fully supported (approved Founder
Decision — "Anonymous Users May: Run simulations, View simulation results,
Share simulation links"), but a simulation created by an authenticated
caller now correctly attaches `user_id`, and retrieval now enforces real
ownership instead of the M4 placeholder that made every user-owned
simulation unconditionally forbidden.
"""

import uuid

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.v1.dependencies import (
    get_current_user_optional,
    get_db_session,
    rate_limit_simulation,
)
from app.api.v1.schemas.common import SuccessResponse
from app.api.v1.schemas.simulations import SimulationCreateRequest, SimulationResponse
from app.api.v1.services import simulation_service
from app.core.request_id import get_request_id
from app.models import User

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
    current_user: User | None = Depends(get_current_user_optional),
):
    # Public for MVP (approved Founder Decision: Anonymous Users may run
    # simulations) — user_id is attached opportunistically when a valid
    # session is present, otherwise the simulation is created anonymously.
    user_id: uuid.UUID | None = current_user.id if current_user is not None else None

    outcome, asset_symbol = simulation_service.create_simulation(
        session, request, request_id=get_request_id(http_request), user_id=user_id
    )

    body = SimulationResponse.from_simulation(
        outcome.simulation, asset_symbol, outcome.disclosed_splits, outcome.growth_series
    )
    response.headers["Location"] = f"/api/v1/simulations/{body.id}"
    return SuccessResponse(data=body)


@router.get("/{simulation_id}", response_model=SuccessResponse[SimulationResponse])
def get_simulation(
    simulation_id: uuid.UUID,
    session=Depends(get_db_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    # Anonymous-owned simulations (user_id IS NULL) remain readable by
    # anyone with the id/link (approved Founder Decision: Anonymous Users
    # may view simulation results and share simulation links) — ownership
    # enforcement only applies when the simulation itself has a user_id.
    requesting_user_id = current_user.id if current_user is not None else None
    simulation, disclosed_splits, growth_series = simulation_service.get_simulation_by_id(
        session, simulation_id, requesting_user_id=requesting_user_id
    )
    body = SimulationResponse.from_simulation(
        simulation, simulation.asset.symbol, disclosed_splits, growth_series
    )
    return SuccessResponse(data=body)
