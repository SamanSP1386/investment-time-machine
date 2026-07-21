from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_returns_success() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"status": "healthy"}}


def test_healthz_check_returns_success() -> None:
    """`/healthz` — the conventional platform health-check path, used as
    Render's `healthCheckPath` (`render.yaml`) — mirrors `/health` exactly."""
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"status": "healthy"}}
