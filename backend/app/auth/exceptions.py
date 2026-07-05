"""Explicit Identity Management error taxonomy, mirroring the discipline
already established in `app.simulation.exceptions`: no layer in this package
catches a bare `Exception` and repackages it as a generic failure.

Deliberate error-message uniformity (security property, not an oversight):
`InvalidCredentialsError` is raised for *both* "no such email" and "wrong
password" — never distinguished — so the API can never be used to enumerate
which emails have an account (Founder Specification's threat model doesn't
name this threat explicitly, but the M5 design review's own risk review
flagged it, see docs/MILESTONE_REPORTS/M5_REPORT.md). `AccountInactiveError`
is intentionally only ever raised *after* a password has already been
verified correct — see `app.auth.service.authenticate` — so a wrong-password
guess against a suspended account still yields the generic
`InvalidCredentialsError`, not a signal that the account exists but is
suspended.
"""


class AuthError(Exception):
    """Base for every controlled error the Identity system can raise."""


class EmailAlreadyRegisteredError(AuthError):
    """Registration only — revealing this is standard, low-risk signup UX
    (distinct from the login-enumeration concern `InvalidCredentialsError`
    exists to prevent)."""

    def __init__(self, email: str) -> None:
        self.email = email
        super().__init__(f"An account already exists for '{email}'")


class WeakPasswordError(AuthError):
    """Founder Specification 3.3.8 requires a password to "meet
    requirements" without ever defining them — see the M5 design review's
    Founder Decision #10 recommendation for the floor this project applies."""


class InvalidCredentialsError(AuthError):
    """Email not found, or password incorrect — deliberately
    indistinguishable to the caller. See module docstring."""

    def __init__(self) -> None:
        super().__init__("Invalid email or password")


class AccountLockedError(AuthError):
    """Founder Specification 3.6.7 (Credential Stuffing) mitigation:
    'Account lockout policies.' Raised before any password check is even
    attempted, once an account has accumulated enough recent failures."""

    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Too many failed login attempts. Try again later.")


class AccountInactiveError(AuthError):
    """Founder Specification 3.3.9: 'Disabled Account -> Authentication
    denied,' a distinct error from invalid credentials. Only ever raised
    after the password has already been verified correct — see module
    docstring."""


class InvalidRefreshTokenError(AuthError):
    """Refresh token missing, expired, or revoked — deliberately
    indistinguishable to the caller (all map to the same generic 401)."""

    def __init__(self) -> None:
        super().__init__("Invalid or expired refresh token")


class RefreshTokenReuseDetectedError(InvalidRefreshTokenError):
    """A refresh token that was already rotated away (or already logged out)
    was presented again — a strong signal of token theft, since a legitimate
    client always has only the newest token in the rotation chain. Raised as
    a distinct internal type so the caller (`app.api.v1.services.auth_service`)
    can log/audit it as a security event, but it still maps to the same
    generic 401 response as any other invalid refresh token — an attacker
    must never learn that reuse detection specifically fired."""


class InvalidAccessTokenError(AuthError):
    """Access token missing, malformed, expired, or signature-invalid."""
