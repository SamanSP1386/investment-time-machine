"""Integration tests for /api/v1/auth/{register,login,refresh,logout} —
exercises the full router -> service -> app.auth.service stack against the
real DB (and real Redis for lockout) via the transactional `client` fixture.

Cookie note: `settings.cookie_secure` defaults to True (Secure), and
`TestClient` talks to the app over a plain-http scheme ("http://testserver")
— httpx's cookie jar correctly refuses to *resend* a Secure cookie over a
non-https request, exactly as a real browser would. Tests therefore pass
`cookies=dict(client.cookies)` explicitly on any follow-up request that
needs the session — this reflects a TestClient/httpx transport quirk, not a
weakening of the actual Secure/httpOnly/SameSite=Strict cookie the server
sends (verified directly by `test_register_sets_httponly_secure_strict_cookies`).
"""

import uuid


def _cookies(client) -> dict:
    return dict(client.cookies)


def _unique_email() -> str:
    return f"api-test-{uuid.uuid4()}@example.com"


def _register(client, *, email=None, password="a-strong-password", display_name="Jane Doe"):
    return client.post(
        "/api/v1/auth/register",
        json={
            "email": email or _unique_email(),
            "password": password,
            "display_name": display_name,
        },
    )


# --- register --------------------------------------------------------------


def test_register_returns_user_and_no_credential_material(client):
    email = _unique_email()
    response = _register(client, email=email)

    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    user = body["data"]["user"]
    assert user["email"] == email
    assert user["display_name"] == "Jane Doe"
    assert user["is_admin"] is False
    assert "password" not in user
    assert "password_hash" not in user
    assert "access_token" not in body["data"]
    assert "refresh_token" not in body["data"]


def test_register_sets_httponly_secure_strict_cookies(client):
    response = _register(client)

    set_cookie_headers = response.headers.get_list("set-cookie")
    assert len(set_cookie_headers) == 2
    for header in set_cookie_headers:
        assert "HttpOnly" in header
        assert "Secure" in header
        assert "SameSite=strict" in header
    assert any(header.startswith("access_token=") for header in set_cookie_headers)
    assert any(header.startswith("refresh_token=") for header in set_cookie_headers)


def test_register_rejects_duplicate_email(client):
    email = _unique_email()
    assert _register(client, email=email).status_code == 201

    response = _register(client, email=email)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"


def test_register_rejects_short_password_as_validation_error(client):
    response = _register(client, password="short")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# --- login ------------------------------------------------------------------


def test_login_succeeds_with_correct_password(client):
    email = _unique_email()
    _register(client, email=email, password="a-strong-password")

    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "a-strong-password"}
    )

    assert response.status_code == 200
    assert response.json()["data"]["user"]["email"] == email


def test_login_rejects_wrong_password(client):
    email = _unique_email()
    _register(client, email=email, password="a-strong-password")

    response = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_rejects_unknown_email_identically_to_wrong_password(client):
    """Account-enumeration check at the HTTP layer: an email that was never
    registered must produce the exact same status and error code as a
    wrong password against a real account."""
    unknown = client.post(
        "/api/v1/auth/login", json={"email": _unique_email(), "password": "whatever"}
    )

    email = _unique_email()
    _register(client, email=email, password="a-strong-password")
    wrong_password = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong"})

    assert unknown.status_code == wrong_password.status_code == 401
    assert (
        unknown.json()["error"]["code"]
        == wrong_password.json()["error"]["code"]
        == "INVALID_CREDENTIALS"
    )


# --- refresh ------------------------------------------------------------------


def test_refresh_issues_new_cookies(client):
    _register(client)
    old_refresh_cookie = client.cookies.get("refresh_token")

    response = client.post("/api/v1/auth/refresh", cookies=_cookies(client))

    assert response.status_code == 200
    new_set_cookie_headers = response.headers.get_list("set-cookie")
    assert any(header.startswith("refresh_token=") for header in new_set_cookie_headers)
    # httpx updates client.cookies in place from the response automatically.
    assert client.cookies.get("refresh_token") != old_refresh_cookie


def test_refresh_without_any_cookie_is_rejected(client):
    response = client.post("/api/v1/auth/refresh", cookies={})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_REFRESH_TOKEN"


def test_reusing_a_rotated_away_refresh_token_is_rejected(client):
    _register(client)
    original_refresh_cookie = client.cookies.get("refresh_token")

    # Legitimate rotation.
    client.post("/api/v1/auth/refresh", cookies=_cookies(client))

    # Replay the now-stale token (simulating a thief who captured it before
    # rotation) — must fail with the same generic code as any other invalid
    # refresh token (reuse detection must never be disclosed to the caller).
    replay = client.post("/api/v1/auth/refresh", cookies={"refresh_token": original_refresh_cookie})
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "INVALID_REFRESH_TOKEN"


# --- logout -------------------------------------------------------------------


def test_logout_clears_cookies(client):
    _register(client)

    response = client.post("/api/v1/auth/logout", cookies=_cookies(client))

    assert response.status_code == 200
    assert response.json()["data"] == {}
    set_cookie_headers = response.headers.get_list("set-cookie")
    # Clearing a cookie is expressed as an immediately-expired Set-Cookie.
    assert any(
        header.startswith("access_token=") and ("Max-Age=0" in header or "1970" in header)
        for header in set_cookie_headers
    )


def test_logout_revokes_the_refresh_token(client):
    _register(client)
    refresh_cookie = client.cookies.get("refresh_token")

    client.post("/api/v1/auth/logout", cookies=_cookies(client))

    # The now-revoked refresh token must no longer work.
    response = client.post("/api/v1/auth/refresh", cookies={"refresh_token": refresh_cookie})
    assert response.status_code == 401


def test_logout_without_any_cookie_still_succeeds(client):
    response = client.post("/api/v1/auth/logout", cookies={})
    assert response.status_code == 200
    assert response.json()["success"] is True


# --- wiring into simulations (task 5: optional/required current-user) -------


def test_simulation_created_while_authenticated_is_forbidden_to_others(client, db_session):
    from datetime import date

    from tests.simulation.conftest import make_asset, make_price

    symbol = f"AUTH{uuid.uuid4().hex[:6].upper()}"
    asset = make_asset(db_session, symbol=symbol, name="Auth Wiring Test Co")
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    make_price(db_session, asset, date(2021, 1, 4), "120.00")
    db_session.flush()

    _register(client)  # user A is now logged in on `client`
    create_response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
        cookies=_cookies(client),
    )
    assert create_response.status_code == 201
    simulation_id = create_response.json()["data"]["id"]

    # User A can read their own simulation.
    own_read = client.get(f"/api/v1/simulations/{simulation_id}", cookies=_cookies(client))
    assert own_read.status_code == 200

    # An anonymous caller (no cookies) cannot.
    anon_read = client.get(f"/api/v1/simulations/{simulation_id}", cookies={})
    assert anon_read.status_code == 403
    assert anon_read.json()["error"]["code"] == "FORBIDDEN"


def test_anonymous_simulation_remains_publicly_readable(client, db_session):
    from datetime import date

    from tests.simulation.conftest import make_asset, make_price

    symbol = f"ANON{uuid.uuid4().hex[:6].upper()}"
    asset = make_asset(db_session, symbol=symbol, name="Anonymous Wiring Test Co")
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    make_price(db_session, asset, date(2021, 1, 4), "120.00")
    db_session.flush()

    create_response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
        cookies={},
    )
    assert create_response.status_code == 201
    simulation_id = create_response.json()["data"]["id"]

    # Approved Founder Decision: anonymous users may view/share simulation
    # results — no auth required to read it back.
    read_response = client.get(f"/api/v1/simulations/{simulation_id}", cookies={})
    assert read_response.status_code == 200
