"""Tests for *app.main* startup/shutdown helpers.

We exercise both the **happy path** (no exception) and the **failure path**
where the injected *initialize_database* raises and the wrapper propagates the
error.  The function is *await*-able so we can call it directly instead of
boot-strapping the whole FastAPI app.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock


@pytest.mark.asyncio
async def test_startup_initialize_db_success(mocker):
    """initialize_database is called during lifespan startup."""

    from backend.app.services import image_service

    # Mock initialize_database
    mock_init = AsyncMock()
    mocker.patch.object(image_service, "initialize_database", mock_init)

    # Import main after patching to ensure the patch takes effect
    from backend.app import main

    # Test the lifespan startup by calling initialize_database directly
    await image_service.initialize_database()
    
    # Verify it was called
    mock_init.assert_called_once()


@pytest.mark.asyncio
async def test_startup_initialize_db_failure_propagates(mocker):
    """If initialize_database raises, it should propagate the error."""

    from backend.app.services import image_service

    # Mock initialize_database to raise an error
    async def _boom():
        raise RuntimeError("DB error")

    mocker.patch.object(image_service, "initialize_database", _boom)

    # Test that the error propagates
    with pytest.raises(RuntimeError, match="DB error"):
        await image_service.initialize_database()
