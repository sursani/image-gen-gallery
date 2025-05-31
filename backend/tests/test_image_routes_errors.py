"""Additional edge-case tests for *image_routes* error branches that were
previously uncovered.
"""

from __future__ import annotations

from pathlib import Path

import pytest


@pytest.mark.asyncio
async def test_get_image_file_db_entry_but_missing_file(client, mocker):
    """When DB returns a filename that does **not** exist on disk, endpoint -> 404."""

    from backend.app.routes import image_routes as ir

    # Patch the service to return a deterministic filename that we will *not*
    # create on the filesystem.
    mocker.patch.object(ir, "get_image_filename_by_id", return_value="ghost.png")

    resp = client.get("/api/images/abc123")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_image_file_invalid_filename(client, mocker):
    """A filename containing path separators should be rejected with 400."""

    from backend.app.routes import image_routes as ir

    # '../evil.png' triggers the safety check inside the route
    mocker.patch.object(ir, "get_image_filename_by_id", return_value="../evil.png")

    resp = client.get("/api/images/badid")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_image_by_filename_unknown_extension(client, tmp_storage_dir):
    """If the file has an extension the route does not recognize, it should still
    return 200 with *None* media-type (which FastAPI defaults appropriately).
    """

    img_path = Path(tmp_storage_dir) / "images" / "odd.ext"
    img_path.parent.mkdir(parents=True, exist_ok=True)
    img_path.write_bytes(b"data")

    resp = client.get(f"/api/images/file/{img_path.name}")
    assert resp.status_code == 200
