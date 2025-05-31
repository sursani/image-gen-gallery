"""
Test the editing routes in isolation.

This module demonstrates how to mount *only* the editing router (not the entire
FastAPI app) and mock its service layer dependencies.

Testing at the router level allows for fine-grained control over what gets
mocked without touching the broader app configuration.
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

    from backend.app.services import openai_service

    # ------------------------------------------------------------------
    # Mock the actual function in openai_service that gets called
    # ------------------------------------------------------------------

    async def _fake_edit_image_from_prompt_stream(**kwargs):  # noqa: D401
        """Mock streaming function that yields image data."""
        yield {"type": "progress", "data": {"status": "started"}}
        yield {"type": "progress", "data": {"status": "processing"}}
        yield {"type": "image", "data": "FAKE_B64_IMG"}

    async def _fake_save_image_from_base64(**kwargs):  # noqa: D401
        """Mock save function that returns fake metadata."""
        from backend.app.models.image_metadata import ImageMetadata
        from datetime import datetime, timezone
        import uuid
        
        return [ImageMetadata(
            id=str(uuid.uuid4()),
            prompt=kwargs.get("prompt", "test"),
            filename="test.png",
            timestamp=datetime.now(timezone.utc),
            parameters=kwargs.get("parameters", {})
        )]

    # Mock the functions in openai_service
    mocker.patch.object(openai_service, "edit_image_from_prompt_stream", _fake_edit_image_from_prompt_stream)
    mocker.patch.object(openai_service, "save_image_from_base64", _fake_save_image_from_base64)

    # Create a minimal FastAPI app with just the editing router
    from backend.app.routes.editing_routes import router as editing_router

    app = FastAPI()
    app.include_router(editing_router, prefix="/edit")

    return TestClient(app)


def test_editing_route_success(editing_client):
    """POST /edit/stream succeeds with valid image and prompt."""

    # Create a minimal PNG file in memory for testing
    import base64
    png_bytes = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMB"
        "gPb+cc0AAAAASUVORK5CYII="
    )

    files = {"image": ("test.png", png_bytes, "image/png")}
    data = {"prompt": "Make it blue"}

    response = editing_client.post("/edit/stream", files=files, data=data)
    
    # The endpoint returns streaming response, so we expect 200
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"


def test_editing_route_invalid_mime(editing_client):
    """POST /edit/stream rejects unsupported file types."""

    files = {"image": ("test.txt", b"fake content", "text/plain")}
    data = {"prompt": "Test prompt"}

    response = editing_client.post("/edit/stream", files=files, data=data)
    
    assert response.status_code == 400
    assert "Invalid image file type" in response.json()["detail"]


def test_editing_route_file_too_large(editing_client):
    """POST /edit/stream rejects files exceeding the size limit."""

    # Create a file larger than the 4MB limit
    large_content = b"x" * (5 * 1024 * 1024)  # 5MB
    files = {"image": ("large.png", large_content, "image/png")}
    data = {"prompt": "Test prompt"}

    response = editing_client.post("/edit/stream", files=files, data=data)
    
    assert response.status_code == 400
    assert "exceeds limit" in response.json()["detail"]
