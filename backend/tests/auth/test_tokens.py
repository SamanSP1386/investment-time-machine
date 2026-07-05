"""Pure unit tests — no database required."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.auth.exceptions import InvalidAccessTokenError
from app.auth.tokens import (
    ACCESS_TOKEN_ALGORITHM,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.core.config import get_settings


def test_create_and_decode_access_token_round_trip():
    user_id = uuid.uuid4()
    token = create_access_token(user_id, is_admin=False)

    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["is_admin"] is False
    assert payload["typ"] == "access"


def test_decode_rejects_tampered_signature():
    token = create_access_token(uuid.uuid4(), is_admin=False)
    # Tamper a character well inside the signature segment, not the very
    # last character of the token: base64url's final character can encode
    # a couple of "don't care" padding bits that a lenient decoder (PyJWT
    # included, per RFC 7515) tolerates without changing the decoded bytes —
    # flipping only that position would make this test flaky/no-op.
    index = len(token) - 10
    flipped_char = "A" if token[index] != "A" else "B"
    tampered = token[:index] + flipped_char + token[index + 1 :]

    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(tampered)


def test_decode_rejects_expired_token():
    settings = get_settings()
    now = datetime.now(UTC)
    expired_payload = {
        "sub": str(uuid.uuid4()),
        "is_admin": False,
        "iat": now - timedelta(minutes=20),
        "exp": now - timedelta(minutes=5),
        "jti": uuid.uuid4().hex,
        "typ": "access",
    }
    expired_token = jwt.encode(
        expired_payload, settings.jwt_secret, algorithm=ACCESS_TOKEN_ALGORITHM
    )

    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(expired_token)


def test_decode_rejects_wrong_token_type():
    """A token that doesn't carry `typ: access` (e.g. a hypothetical future
    token category) must never be accepted as an access token."""
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(uuid.uuid4()),
        "is_admin": False,
        "iat": now,
        "exp": now + timedelta(minutes=15),
        "jti": uuid.uuid4().hex,
        "typ": "not-access",
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=ACCESS_TOKEN_ALGORITHM)

    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(token)


def test_decode_rejects_token_signed_with_wrong_secret():
    now = datetime.now(UTC)
    payload = {
        "sub": str(uuid.uuid4()),
        "is_admin": True,
        "iat": now,
        "exp": now + timedelta(minutes=15),
        "jti": uuid.uuid4().hex,
        "typ": "access",
    }
    forged_token = jwt.encode(
        payload, "attacker-controlled-secret", algorithm=ACCESS_TOKEN_ALGORITHM
    )

    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(forged_token)


def test_generate_refresh_token_is_unique_and_high_entropy():
    tokens = {generate_refresh_token() for _ in range(20)}
    assert len(tokens) == 20
    assert all(len(t) >= 32 for t in tokens)


def test_hash_refresh_token_is_deterministic_and_never_reveals_raw_value():
    raw = generate_refresh_token()
    assert hash_refresh_token(raw) == hash_refresh_token(raw)
    assert hash_refresh_token(raw) != raw


def test_hash_refresh_token_differs_for_different_inputs():
    assert hash_refresh_token(generate_refresh_token()) != hash_refresh_token(
        generate_refresh_token()
    )
