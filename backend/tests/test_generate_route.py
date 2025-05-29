import base64

import pytest


@pytest.fixture(autouse=True)
def mock_openai_generate(mocker):
    """Mock OpenAI image generation to avoid network calls."""

    fake_png_b64 = base64.b64encode(b"PNGDATA").decode()

    class _Item:
        type = "image_generation_call"
        result = fake_png_b64

    async def _fake_create(**kwargs):
        return type("Resp", (), {"output": [_Item()]})

    mocker.patch(
        "backend.app.services.openai_service.client.responses.create", _fake_create
    )


@pytest.mark.asyncio
async def test_generate_image_ok(client):
    resp = client.post(
        "/api/generate",
        json={"prompt": "sunset over mountains", "size": "1024x1024", "quality": "auto"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["prompt"] == "sunset over mountains"
    assert payload["filename"].endswith(".png")
