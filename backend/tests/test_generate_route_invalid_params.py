import pytest


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        # Invalid quality value
        {"prompt": "test prompt", "quality": "invalid_quality", "size": "1024x1024", "n": 1},
        # Invalid size value
        {"prompt": "test prompt", "quality": "auto", "size": "800x800", "n": 1},
        # n below allowed range
        {"prompt": "test prompt", "quality": "auto", "size": "1024x1024", "n": 0},
        # n above allowed range
        {"prompt": "test prompt", "quality": "auto", "size": "1024x1024", "n": 11},
    ],
)
async def test_generate_invalid_params_returns_422(client, payload):
    """POST /api/generate with invalid parameter values should trigger FastAPI 422 validation errors."""

    resp = client.post("/api/generate", json=payload)

    # FastAPI should reject the request before it reaches the handler
    assert resp.status_code == 422

    # Optionally, ensure the response contains details about the failing field
    body = resp.json()
    assert "detail" in body 