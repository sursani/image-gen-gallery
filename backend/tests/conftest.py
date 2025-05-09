import asyncio

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

# App import must happen after we tweak settings via monkeypatch (storage
# dir), so we wrap it inside a fixture.


@pytest_asyncio.fixture(scope="function")
def event_loop():
    """Create an asyncio event loop for each test function."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture()
async def tmp_storage_dir(tmp_path, monkeypatch):
    """Redirect Settings.storage_dir to a unique temporary directory."""

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


@pytest_asyncio.fixture()
async def client(tmp_storage_dir):
    """Return a FastAPI TestClient bound to the application."""

    from backend.app.main import app

    # Create a TestClient
    return TestClient(app)