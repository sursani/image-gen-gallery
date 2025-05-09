import pytest


@pytest.mark.asyncio
async def test_health_ok(client):
    # client is already a TestClient instance, no need to await
    resp = client.get("/health")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["status"] == "OK"
    assert payload["database"] == "OK"
