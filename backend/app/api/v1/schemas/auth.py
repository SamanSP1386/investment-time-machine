from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.auth.password import MIN_PASSWORD_LENGTH
from app.models import User


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserPublic(BaseModel):
    """Never includes `password_hash` or any credential material — the only
    user-shaped response this API ever returns."""

    id: uuid.UUID
    email: str
    display_name: str
    is_admin: bool
    created_at: datetime

    @classmethod
    def from_user(cls, user: User) -> UserPublic:
        return cls(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            is_admin=user.is_admin,
            created_at=user.created_at,
        )


class AuthResponse(BaseModel):
    """Access and refresh tokens are never present in this body — both are
    delivered exclusively via httpOnly cookies (approved Founder Decision:
    Cookie Strategy). No JavaScript on the frontend, including any XSS
    payload, can read either token from this response."""

    user: UserPublic
