"""Integration tests for GET /api/v1/assets* (Founder Specification Part
3.3.5, 3.3.6). Uses the real DB via the transactional `client`/`db_session`
fixtures (tests/api/conftest.py) — nothing here mocks the query layer.
"""

import uuid
from datetime import date

from tests.simulation.conftest import make_asset, make_price


def test_search_assets_matches_symbol_and_name(client, db_session):
    make_asset(db_session, symbol=f"AAPL{uuid.uuid4().hex[:6]}", name="Apple Inc")
    unique = uuid.uuid4().hex[:8].upper()
    make_asset(db_session, symbol=unique, name="Unique Search Target Co")
    db_session.flush()

    response = client.get("/api/v1/assets", params={"query": unique})

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["total"] == 1
    assert body["data"]["assets"][0]["symbol"] == unique


def test_search_assets_requires_nonempty_query(client, db_session):
    response = client.get("/api/v1/assets", params={"query": ""})

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_get_asset_detail_returns_null_exchange(client, db_session):
    symbol = f"DETAIL{uuid.uuid4().hex[:6].upper()}"
    make_asset(db_session, symbol=symbol, name="Detail Test Co")
    db_session.flush()

    response = client.get(f"/api/v1/assets/{symbol}")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["symbol"] == symbol
    assert body["exchange"] is None  # KI-025: no exchange column in M1 schema


def test_get_asset_detail_not_found_returns_404(client, db_session):
    response = client.get("/api/v1/assets/NOSUCHSYMBOL")

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "ASSET_NOT_FOUND"
    assert "request_id" in body["error"]


def test_get_asset_availability_returns_price_date_range(client, db_session):
    symbol = f"AVAIL{uuid.uuid4().hex[:6].upper()}"
    asset = make_asset(db_session, symbol=symbol)
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    make_price(db_session, asset, date(2023, 6, 15), "150.00")
    db_session.flush()

    response = client.get(f"/api/v1/assets/{symbol}/availability")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["earliest_date"] == "2020-01-02"
    assert body["latest_date"] == "2023-06-15"


def test_get_asset_availability_no_price_rows_returns_404(client, db_session):
    symbol = f"NOPRICE{uuid.uuid4().hex[:6].upper()}"
    make_asset(db_session, symbol=symbol)
    db_session.flush()

    response = client.get(f"/api/v1/assets/{symbol}/availability")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ASSET_NOT_FOUND"


def test_get_asset_availability_unknown_symbol_returns_404(client, db_session):
    response = client.get("/api/v1/assets/NOSUCHSYMBOL/availability")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ASSET_NOT_FOUND"
