"""Error-path tests to ensure API returns expected HTTP status codes when
invalid input or internal failures occur.
"""

import pytest


# ---------------------------------------------------------------------------
# /api/images validation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_images_invalid_limit(client):
    """limit must be >=1 – 0 should raise a 422 validation error."""

    resp = client.get("/api/images", params={"limit": 0})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_images_invalid_offset(client):
    """offset must be >=0 – negative should raise 422."""

    resp = client.get("/api/images", params={"offset": -5})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /api/generate validation + internal error propagation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_missing_prompt(client):
    """'prompt' is a required field; omitting it returns 422."""

    resp = client.post("/api/generate", json={"size": "1024x1024"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_generate_internal_failure(client, mocker):
    """If the OpenAI service returns no image data the route should reply 500."""

    # Patch generate_image_from_prompt to simulate OpenAI API returning nothing
    async def mock_generate_failure(*args, **kwargs):
        return (None, None)

    mocker.patch(
        "backend.app.services.openai_service.generate_image_from_prompt",
        side_effect=mock_generate_failure,
    )

    resp = client.post(
        "/api/generate",
        json={"prompt": "broken test", "size": "1024x1024", "quality": "auto"},
    )

    assert resp.status_code == 500
    json_body = resp.json()
    assert json_body["detail"] == "Image generation failed."
