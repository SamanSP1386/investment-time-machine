"""Direct unit tests for the authentication/authorization dependency
functions (`app.api.v1.dependencies`), called as plain Python functions
rather than through FastAPI's DI — this is the only way to exercise
`get_current_admin_user`'s rejection path today, since no admin route
exists yet to trigger it via HTTP (mirrors M4's own honest acknowledgment
that `ForbiddenError` was "correctly untestable until M5" for the same
reason — the M5 equivalent is untestable-via-HTTP until a real admin route
exists, so it is tested directly instead).
"""

import pytest

from app.api.v1.dependencies import get_current_admin_user, get_current_user_required
from app.api.v1.errors import ForbiddenError, UnauthorizedError


class _FakeUser:
    def __init__(self, is_admin: bool) -> None:
        self.is_admin = is_admin


def test_get_current_user_required_rejects_none():
    with pytest.raises(UnauthorizedError):
        get_current_user_required(None)


def test_get_current_user_required_passes_through_a_real_user():
    user = _FakeUser(is_admin=False)
    assert get_current_user_required(user) is user


def test_get_current_admin_user_rejects_non_admin():
    with pytest.raises(ForbiddenError):
        get_current_admin_user(_FakeUser(is_admin=False))


def test_get_current_admin_user_passes_through_an_admin():
    user = _FakeUser(is_admin=True)
    assert get_current_admin_user(user) is user
