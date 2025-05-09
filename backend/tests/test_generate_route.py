import base64

import pytest


@pytest.fixture(autouse=True)
def mock_openai_generate(mocker):
    """Mock OpenAI image generation to avoid network calls."""

    fake_png_b64 = base64.b64encode(b"PNGDATA").decode()

    class _Item:
        b64_json = fake_png_b64
        revised_prompt = None

    async def _fake_generate(**kwargs):
        return type("Resp", (), {"data": [_Item()]})

    mocker.patch(
        "backend.app.services.openai_service.client.images.generate", _fake_generate
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
