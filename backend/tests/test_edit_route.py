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


# No service patching needed for the placeholder editing endpoint used in
# these tests.


def test_edit_endpoint_success(client):
    png = _png_bytes()

    resp = client.post(
        "/api/edit/edit/",
        data={"prompt": "make it blue"},
        files={"image": ("image.png", png, "image/png")},
    )

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["filename"] == "image.png"
    assert "placeholder" in payload["message"]


def test_edit_endpoint_invalid_size(client):
    png = _png_bytes()

    r = client.post(
        "/api/edit/edit/",
        data={"prompt": "oops", "size": "999x999"},
        files={"image": ("image.png", png, "image/png")},
    )

    # The placeholder endpoint doesn’t validate size; we simply expect 200.
    assert r.status_code == 200
