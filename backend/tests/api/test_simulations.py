"""Integration tests for POST/GET /api/v1/simulations (Founder Specification
Part 3.3.2, 2.6.24). Exercises the full router -> service -> engine ->
repository stack against the real DB via the transactional `client`
fixture — no mocking of the calculation layer.
"""

import uuid
from datetime import date

from app.api.v1.dependencies import rate_limit_simulation
from app.api.v1.errors import RateLimitExceededError
from app.main import app
from tests.simulation.conftest import make_asset, make_dividend, make_price


def _make_priced_asset(db_session, *, with_dividend: bool = False):
    symbol = f"SIM{uuid.uuid4().hex[:8].upper()}"
    asset = make_asset(db_session, symbol=symbol, name="Simulation Test Co")
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    make_price(db_session, asset, date(2020, 6, 15), "110.00")
    make_price(db_session, asset, date(2021, 1, 4), "120.00")
    if with_dividend:
        make_dividend(db_session, asset, date(2020, 6, 15), "1.00")
    db_session.flush()
    return symbol


def test_create_simulation_success_returns_201_with_growth_series(client, db_session):
    symbol = _make_priced_asset(db_session)

    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )

    assert response.status_code == 201
    assert response.headers["location"].startswith("/api/v1/simulations/")
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["asset_symbol"] == symbol
    assert data["final_value"] == "1200.00000000"
    assert len(data["growth_series"]) == 3
    assert data["growth_series"][0]["point_date"] == "2020-01-02"
    assert data["growth_series"][-1]["point_date"] == "2021-01-04"


def test_create_simulation_uses_founder_spec_field_names(client, db_session):
    symbol = _make_priced_asset(db_session, with_dividend=True)

    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
            "include_dividends": True,
            "adjust_for_inflation": False,
        },
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["include_dividends"] is True
    assert data["adjust_for_inflation"] is False


def test_create_simulation_unknown_asset_returns_404(client, db_session):
    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": "NOSUCHSYMBOL",
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "ASSET_NOT_FOUND"


def test_create_simulation_invalid_date_range_returns_422(client, db_session):
    symbol = _make_priced_asset(db_session)

    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2021-01-04",
            "end_date": "2020-01-02",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_DATE_RANGE"


def test_create_simulation_non_positive_amount_returns_validation_error(client, db_session):
    symbol = _make_priced_asset(db_session)

    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "0",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_simulation_missing_price_data_returns_422_with_simulation_id(client, db_session):
    symbol = f"SIM{uuid.uuid4().hex[:8].upper()}"
    asset = make_asset(db_session, symbol=symbol)
    make_price(db_session, asset, date(2020, 1, 2), "100.00")
    # No price row for the end date -> MissingHistoricalDataError, but the
    # engine still persists a failed Simulation row first (Founder
    # Specification Part 2.6.24).
    db_session.flush()

    response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "MISSING_HISTORICAL_DATA"
    assert body["error"]["simulation_id"] is not None


def test_get_simulation_by_id_round_trips(client, db_session):
    symbol = _make_priced_asset(db_session)

    create_response = client.post(
        "/api/v1/simulations",
        json={
            "asset_symbol": symbol,
            "investment_amount": "1000",
            "start_date": "2020-01-02",
            "end_date": "2021-01-04",
        },
    )
    simulation_id = create_response.json()["data"]["id"]

    response = client.get(f"/api/v1/simulations/{simulation_id}")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["id"] == simulation_id
    assert body["asset_symbol"] == symbol
    # KI-021: growth_series/disclosed_splits are never persisted, so a
    # retrieval-after-creation GET (unlike the immediate POST response)
    # returns them empty — a documented M4 scope cut.
    assert body["growth_series"] == []


def test_get_simulation_not_found_returns_404(client, db_session):
    response = client.get(f"/api/v1/simulations/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SIMULATION_NOT_FOUND"


def test_rate_limit_exceeded_returns_429(client, db_session):
    symbol = _make_priced_asset(db_session)

    def _always_exceeded():
        raise RateLimitExceededError()

    app.dependency_overrides[rate_limit_simulation] = _always_exceeded
    try:
        response = client.post(
            "/api/v1/simulations",
            json={
                "asset_symbol": symbol,
                "investment_amount": "1000",
                "start_date": "2020-01-02",
                "end_date": "2021-01-04",
            },
        )
    finally:
        app.dependency_overrides[rate_limit_simulation] = lambda: None

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
