import asyncio

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

# App import must happen after we tweak settings via monkeypatch (storage
# dir), so we wrap it inside a fixture.


@pytest_asyncio.fixture(scope="function")
async def tmp_storage_dir(tmp_path, monkeypatch):
    """Redirect Settings.storage_dir to a unique temporary directory."""

    # 0. Inject a dummy API key so Settings() validation passes without requiring
    # a real secret in the test environment. This **must** happen before the
    # first import of `backend.app.core.settings`.
    monkeypatch.setenv("OPENAI_API_KEY", "test-api-key")

    from backend.app.core.settings import settings

    # 1. Point settings to the temp directory
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path))

    # 2. Ensure modules that cached the path are updated
    import importlib
    from backend.app.services import openai_service

    openai_service.IMAGE_STORAGE_PATH = (
        tmp_path / "images"
    )  # type: ignore[attr-defined]

    # 3. Re-initialise DB at new location
    from backend.app.services import image_service

    await image_service.initialize_database()

    return tmp_path


@pytest_asyncio.fixture(scope="function")
async def client(tmp_storage_dir):
    """Return a FastAPI TestClient bound to the application."""

    from backend.app.main import app

    # Create a TestClient
    return TestClient(app)