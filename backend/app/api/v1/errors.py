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
    that user. Since M4 does not implement authentication (M5), the
    requester is always anonymous today — meaning any hypothetically
    user-owned simulation is forbidden to everyone via the API right now,
    which is the safe, fail-closed default until real auth exists."""


class RateLimitExceededError(Exception):
    """Raised by the rate-limit dependencies (`app.api.v1.dependencies`)."""
