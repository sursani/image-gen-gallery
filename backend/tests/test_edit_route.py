"""Tests for the image *editing* endpoint.

The endpoint expects multipart/form-data with an image (PNG) and
optionally a mask.  To keep things fast we generate a 1×1 transparent
PNG entirely in-memory.
"""

import base64
from io import BytesIO

import pytest


_PNG_1x1_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMB"  # noqa: E501
    "gPb+cc0AAAAASUVORK5CYII="
)


def _png_bytes() -> bytes:
    return base64.b64decode(_PNG_1x1_BASE64)


@pytest.fixture(autouse=True)
def mock_openai_edit(mocker):
    """Mock OpenAI image editing to avoid network calls."""

    fake_png_b64 = base64.b64encode(b"EDITEDPNGDATA").decode()

    class _Item:
        b64_json = fake_png_b64
        revised_prompt = None

    async def _fake_edit(**kwargs):
        return type("Resp", (), {"data": [_Item()]})

    mocker.patch(
        "backend.app.services.openai_service.client.images.edit", _fake_edit
    )


def test_edit_endpoint_success(client):
    png = _png_bytes()

    resp = client.post(
        "/api/edit/",
        data={"prompt": "make it blue"},
        files={"image": ("image.png", png, "image/png")},
    )

    assert resp.status_code == 200
    payload = resp.json()
    assert "id" in payload
    assert "filename" in payload


def test_edit_endpoint_invalid_size(client):
    png = _png_bytes()

    r = client.post(
        "/api/edit/",
        data={"prompt": "oops", "size": "999x999"},
        files={"image": ("image.png", png, "image/png")},
    )

    # The endpoint should validate size and return 422 for invalid size
    assert r.status_code == 422
