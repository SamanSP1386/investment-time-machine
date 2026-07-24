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
    """Raised by the rate-limit dependencies (`app.api.v1.dependencies`).

    `window` distinguishes which fixed-window bucket was actually exceeded —
    every existing caller (simulation/read/auth buckets, and the AI bucket's
    per-minute check) leaves it at the default `"minute"`, unchanged from
    this class's original single-window shape. `rate_limit_ai`
    (Founder Decision 015) is the first caller to ever pass `"day"`, so the
    exception handler can give a daily cap its own, honest "come back
    tomorrow" copy instead of the generic "try again shortly" a per-minute
    limit gets — the same limit code, a message that actually matches what
    happened (Founder Decision 015 clause 5)."""

    def __init__(self, *, window: str = "minute") -> None:
        self.window = window
        super().__init__(f"Rate limit exceeded ({window})")


class UnauthorizedError(Exception):
    """Raised by `app.api.v1.dependencies.get_current_user_required` when no
    valid access token is present — distinct from `app.auth.exceptions`
    (which are about credential/token *content*): this is purely "this route
    requires an authenticated caller and none was presented," an API-layer
    access-control concern, not an Identity Management domain error."""


class SimulationNotCompletedError(Exception):
    """M6: Founder Specification Part 3.3.7's Explanation Engine validation
    rule ("Simulation must be completed") — an API-layer precondition
    concern, not an `app.ai` domain error, since it's checked before `app.ai`
    is ever invoked."""

    def __init__(self, simulation_id: uuid.UUID) -> None:
        self.simulation_id = simulation_id
        super().__init__(f"Simulation is not completed: '{simulation_id}'")


class RegenerationCapExceededError(Exception):
    """M6 design review §13/14 (cost control): bounds how many times an
    explanation may be regenerated, or how many Financial Tutor follow-up
    questions may be asked, for a single simulation. A cache hit never
    counts against this — see `app.api.v1.services.explanation_service`."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        super().__init__(f"Limit of {limit} reached for this simulation")
