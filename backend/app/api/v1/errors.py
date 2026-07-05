"""API-layer-only errors — distinct from `app.simulation.exceptions`, which
are Simulation Engine concerns. These two are pure retrieval/access-control
concerns that only make sense at the API boundary.
"""

import uuid


class SimulationNotFoundError(Exception):
    def __init__(self, simulation_id: uuid.UUID) -> None:
        self.simulation_id = simulation_id
        super().__init__(f"Simulation not found: '{simulation_id}'")


class ForbiddenError(Exception):
    """Raised when a simulation's `user_id` is set and the requester is not
    that user (M5: real authentication exists — the requester's identity
    comes from `app.api.v1.dependencies.get_current_user_optional`), and
    also raised by `get_current_admin_user` when an authenticated caller is
    not an administrator. Anonymous-owned simulations (`user_id IS NULL`)
    are never subject to this check — they remain readable by anyone with
    the id, per the approved Founder Decision that anonymous users may view
    and share simulation results."""


class RateLimitExceededError(Exception):
    """Raised by the rate-limit dependencies (`app.api.v1.dependencies`)."""


class UnauthorizedError(Exception):
    """Raised by `app.api.v1.dependencies.get_current_user_required` when no
    valid access token is present — distinct from `app.auth.exceptions`
    (which are about credential/token *content*): this is purely "this route
    requires an authenticated caller and none was presented," an API-layer
    access-control concern, not an Identity Management domain error."""
