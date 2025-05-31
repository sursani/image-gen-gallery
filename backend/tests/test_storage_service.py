"""Integration-style tests for the legacy *storage_service* module.

The aim is twofold:
1. Exercise the full CRUD surface so that we achieve coverage across the
   previously-untested 120+ lines.
2. Verify that the helpers behave correctly (file saved, metadata persisted,
   retrieval functions return the expected objects).

All filesystem interaction is redirected to the *tmp_storage_dir* fixture to
avoid polluting the real repository state.
"""

from __future__ import annotations

import base64
from pathlib import Path

import pytest


# Minimal 1×1 pixel PNG used for the image payload
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMB"
    "gPb+cc0AAAAASUVORK5CYII="
)


@pytest.mark.asyncio
async def test_storage_service_full_cycle(tmp_path):
    """End-to-end test: initialise DB, save an image, and read it back."""

    # ---------------------------------------------------------------------
    # 1. Patch the module-level paths so *storage_service* uses the `tmp_path`
    #    sandbox instead of the hard-coded *backend/local_storage* location.
    # ---------------------------------------------------------------------

    from backend.app.services import storage_service as ss

    ss.STORAGE_DIR = tmp_path  # type: ignore[attr-defined]
    ss.IMAGE_DIR = tmp_path / "images"  # type: ignore[attr-defined]
    ss.DATABASE_PATH = tmp_path / "metadata.db"  # type: ignore[attr-defined]

    # Ensure directories exist according to the patched paths
    ss.IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # 2. Initialise the sqlite schema (should be idempotent).
    # ------------------------------------------------------------------

    ss.initialize_database()

    # Check that the DB file is created
    assert ss.DATABASE_PATH.is_file()

    # ------------------------------------------------------------------
    # 3. Save an image & its metadata
    # ------------------------------------------------------------------

    meta = await ss.save_image_and_metadata(
        prompt="unit-test prompt",
        parameters={"size": "1024x1024"},
        image_data=PNG_BYTES,
        original_filename="input.png",
    )

    # The helper returns None on failure – make sure we got an object back
    assert meta is not None

    # The file should have been written
    saved_file = ss.IMAGE_DIR / meta.filename
    assert saved_file.is_file()
    assert saved_file.read_bytes() == PNG_BYTES

    # ------------------------------------------------------------------
    # 4. Retrieval helpers should return the row we just inserted
    # ------------------------------------------------------------------

    all_records = ss.get_all_metadata()
    assert any(r.id == meta.id for r in all_records)

    fetched = ss.get_metadata_by_id(meta.id)
    assert fetched is not None and fetched.filename == meta.filename

    # ------------------------------------------------------------------
    # 5. Deleting the file and checking *get_metadata_by_id* still works
    #    exercises the error-handling branches.
    # ------------------------------------------------------------------

    saved_file.unlink()  # remove file from disk

    missing_file = ss.get_metadata_by_id(meta.id)
    # Even if the physical file is gone, metadata should still be retrievable
    assert missing_file is not None
