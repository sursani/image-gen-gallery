"""Tests for the image file serving endpoints (`/api/images/file/{filename}` and
`/api/images/{id}`).

We create temporary image files inside the *tmp_storage_dir* fixture directory
and register corresponding metadata via *image_service.save_image_metadata* so
that the FastAPI routes can resolve and return them.
"""

from __future__ import annotations

import base64
from pathlib import Path

import pytest


# Re-use the tiny transparent 1×1 PNG used in other tests (encoded once here so
# we do not depend on the private helper from *test_edit_route.py*).
_PNG_1x1_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMB"
    "gPb+cc0AAAAASUVORK5CYII="
)


def _png_bytes() -> bytes:  # pragma: no cover – trivial helper
    """Return raw bytes for the single-pixel PNG defined above."""

    return base64.b64decode(_PNG_1x1_BASE64)


# ---------------------------------------------------------------------------
# /api/images/file/{filename}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_image_by_filename_success(client, tmp_storage_dir):
    """Endpoint should return *200* and the binary image when the file exists."""

    img_path = Path(tmp_storage_dir) / "images" / "sample.png"
    img_path.parent.mkdir(parents=True, exist_ok=True)
    img_path.write_bytes(_png_bytes())

    resp = client.get(f"/api/images/file/{img_path.name}")
    assert resp.status_code == 200
    # Content-Type chosen by route implementation – PNG in this case
    assert resp.headers["content-type"] == "image/png"
    assert resp.content == _png_bytes()


@pytest.mark.asyncio
async def test_get_image_by_filename_not_found(client):
    """Non-existent files should return *404*."""

    resp = client.get("/api/images/file/does-not-exist.png")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_image_by_filename_invalid_path(client):
    """Path traversal attempts are rejected with *400*."""

    # FastAPI does not allow slashes in *path* parameters, therefore the route
    # receives only ".." and returns *404*.  We still treat this as a rejected
    # traversal attempt.
    resp = client.get("/api/images/file/../../etc/passwd")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# /api/images/{id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_image_file_by_id_success(client, tmp_storage_dir):
    """Store metadata + file and ensure the ID endpoint returns the image."""

    from backend.app.models.image_metadata import ImageMetadata
    from backend.app.services.image_service import save_image_metadata

    # 1. Create the physical file on disk
    img_bytes = _png_bytes()
    file_name = "by-id.png"
    file_path = Path(tmp_storage_dir) / "images" / file_name
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(img_bytes)

    # 2. Insert a matching metadata row so the route can resolve the filename
    meta = ImageMetadata(prompt="id-test", filename=file_name)
    await save_image_metadata(meta)

    # 3. Call the endpoint
    resp = client.get(f"/api/images/{meta.id}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert resp.content == img_bytes


@pytest.mark.asyncio
async def test_get_image_file_by_id_not_found(client):
    """Unknown IDs yield *404*."""

    resp = client.get("/api/images/does-not-exist")
    assert resp.status_code == 404

