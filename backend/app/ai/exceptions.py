"""Explicit Educational AI error taxonomy (Founder Specification Part 2.7),
mirroring the discipline already established in `app.simulation.exceptions`
and `app.auth.exceptions`: no layer in this package catches a bare
`Exception` and repackages it as a generic failure.

Every error type here is deliberately treated the same way by
`app.api.v1.services.explanation_service`: caught, the attempt is recorded as
FAILED, and a safe, generic message is returned to the caller (Founder
Specification Part 2.7.13 — "AI failures must never prevent simulations from
completing"). None of these ever propagate to an HTTP exception handler; the
distinct types exist so the *reason* for a failure can be logged/audited
accurately, not so the API surface exposes it.
"""


class AIError(Exception):
    """Base for every controlled error the Educational AI system can raise."""


class AIProviderUnavailableError(AIError):
    """The configured provider could not produce a response — no provider
    configured (`NullProvider`, `AI_PROVIDER=none`), a network/timeout
    failure, or a vendor API error. Founder Specification Part 2.7.13: this
    must never block simulation completion."""


class AIOutputStructureError(AIError):
    """The model's response is missing one or more required sections
    (Summary, What Happened, Why It Happened, Financial Concepts, Key
    Takeaways, Limitations — Educational Disclaimer is appended by code, not
    generated, so it is never part of this check). Rejected outright, never
    returned partially."""


class AIIntegrityViolationError(AIError):
    """A numeric value in the AI's narrative could not be matched back to any
    value in the simulation's own structured output — Founder Specification
    Part 2.7.9 Rules 3/4. The explanation is rejected outright, never
    returned partially or with the offending figures redacted."""

    def __init__(self, offending_values: list[str]) -> None:
        self.offending_values = offending_values
        super().__init__(f"unverifiable numeric values in AI output: {offending_values}")


class AIUnsafeContentError(AIError):
    """The model's response contains directive investment-advice language
    (Founder Specification Part 2.7.5: "Provide Investment Advice" is a
    named prohibited behavior)."""

    def __init__(self, matched_phrases: list[str]) -> None:
        self.matched_phrases = matched_phrases
        super().__init__(f"disallowed advice-like language detected: {matched_phrases}")
