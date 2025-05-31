"""High-level tests for the *new* editing router (``app/routes/editing_routes.py``).

These are **not** wired into the primary FastAPI application yet, but we can
exercise the route in isolation to drive code-coverage for validation logic
and the overall edit flow.
"""

from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


# Tiny transparent PNG again – we keep a local copy to avoid importing private
# helpers across test modules.
_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMB"
    "gPb+cc0AAAAASUVORK5CYII="
)


def _png_bytes() -> bytes:  # pragma: no cover – trivial helper
    return base64.b64decode(_PNG_BASE64)


@pytest.fixture()
def editing_client(tmp_storage_dir, mocker) -> TestClient:  # noqa: D401
    """Return a *TestClient* with only the editing router mounted."""

    from backend.app.routes import editing_routes as er
    from backend.app.services import openai_service as svc

    # ------------------------------------------------------------------
    # Patch dependencies *as imported by the router* (they were imported via
    # "from ... import" so we must patch the names on the router module, not
    # on the original *openai_service* module).
    # ------------------------------------------------------------------

    async def _fake_edit_image_from_prompt(**kwargs):  # noqa: D401
        return ["FAKE_B64_IMG"]

    from backend.app.routes import editing_routes as er  # local alias

    mocker.patch.object(er, "edit_image_from_prompt", _fake_edit_image_from_prompt)

    from backend.app.models.image_metadata import ImageMetadata

    async def _fake_save_image_from_base64(*args, **kwargs):  # noqa: D401
        return [ImageMetadata(prompt="p", filename="out.png")]

    mocker.patch.object(er, "save_image_from_base64", _fake_save_image_from_base64)

    # Spin up an isolated FastAPI instance
    app = FastAPI()
    app.include_router(er.router, prefix="/edit")

    return TestClient(app)


# ---------------------------------------------------------------------------
# Success path (PNG only, no mask)
# ---------------------------------------------------------------------------


def test_editing_route_success(editing_client):
    png = _png_bytes()

    resp = editing_client.post(
        "/edit/",  # mounted route
        data={"prompt": "some prompt", "size": "1024x1024", "n": 1},
        files={"image": ("input.png", png, "image/png")},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["filename"] == "out.png"


# ---------------------------------------------------------------------------
# Validation errors: wrong mime-type & file too large
# ---------------------------------------------------------------------------


def test_editing_route_invalid_mime(editing_client):
    jpeg_bytes = b"\xff\xd8\xff"  # JPEG magic bytes – our endpoint only allows PNG

    resp = editing_client.post(
        "/edit/",
        data={"prompt": "bad"},
        files={"image": ("bad.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert resp.status_code == 400
    assert "Invalid image file type" in resp.json()["detail"]


def test_editing_route_file_too_large(editing_client):
    big_image = _png_bytes() + b"0" * (4 * 1024 * 1024)  # just over 4 MB

    resp = editing_client.post(
        "/edit/",
        data={"prompt": "big"},
        files={"image": ("big.png", big_image, "image/png")},
    )

    assert resp.status_code == 400
    assert "exceeds limit" in resp.json()["detail"]
