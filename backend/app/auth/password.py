"""Password hashing and validation. Argon2 per Founder Specification Part
2.8.5 ("Required: Argon2. Acceptable fallback: bcrypt") — this project uses
Argon2 directly, no fallback needed.
"""

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash, VerificationError, VerifyMismatchError

from app.auth.exceptions import WeakPasswordError

# Founder Specification 3.3.8 requires a password to "meet requirements"
# without ever defining them (confirmed absent anywhere in the 408-page
# source — see the M5 design review). NIST SP 800-63B favors length over
# forced complexity rules (uppercase/digit/symbol requirements measurably
# push users toward predictable patterns); an 8-character minimum with no
# further composition rule is this project's documented, deliberate answer
# to that spec silence — a Founder Decision, not an invented technicality.
MIN_PASSWORD_LENGTH = 8

_hasher = PasswordHasher()

# A fixed, precomputed hash of a value nobody will ever type, used only to
# keep `verify_password`'s runtime constant when no real user/hash exists to
# compare against (see `app.auth.service.authenticate`) — this closes a
# timing side-channel that would otherwise let an attacker distinguish
# "no such email" (fast) from "wrong password" (slow, because Argon2 ran)
# purely from response latency, one of Founder Specification 3.6's
# Account-Enumeration-adjacent risks flagged in the M5 design review.
_DUMMY_HASH = _hasher.hash("not-a-real-password-used-only-for-timing-parity")


def validate_password_strength(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise WeakPasswordError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Never raises: a wrong password, a malformed hash, or a `None` hash
    (e.g. an OAuth-only account with no password set — schema-permitted per
    ADR-003) are all simply "not a match." `password_hash=None` still runs
    the dummy-hash comparison rather than short-circuiting, preserving the
    timing-parity property described above.
    """
    target_hash = password_hash if password_hash is not None else _DUMMY_HASH
    try:
        _hasher.verify(target_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHash):
        return False
    # A real hash existed and matched. If it didn't (password_hash is None),
    # we still ran the comparison above for timing parity, but there is no
    # real credential to have matched, so this must not report success.
    return password_hash is not None
