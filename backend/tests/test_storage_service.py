"""
Test the image_service persistence layer.

This is an end-to-end storage test that:

• Initializes an SQLite database with table creation
• Saves image metadata and retrieves it back 
• Uses a temporary filesystem sandbox (no pollution)
"""

import pytest
import pytest_asyncio
from pathlib import Path


@pytest.mark.asyncio
async def test_image_service_full_cycle(tmp_path):
    """End-to-end test: initialise DB, save an image, and read it back."""

    # ---------------------------------------------------------------------
    # 1. Patch the module-level paths so image_service uses the `tmp_path`
    #    sandbox instead of the hard-coded backend/local_storage location.
    # ---------------------------------------------------------------------

    from backend.app.services import image_service
    from backend.app.core.settings import settings

    # Patch settings to use temp directory
    original_storage_dir = settings.storage_dir
    settings.storage_dir = str(tmp_path)

    try:
        # Re-initialize the database in the temp location
        await image_service.initialize_database()

        # Test saving image metadata
        from backend.app.models.image_metadata import ImageMetadata
        import uuid
        from datetime import datetime, timezone

        test_metadata = ImageMetadata(
            id=str(uuid.uuid4()),
            prompt="Test image",
            filename="test_image.png", 
            timestamp=datetime.now(timezone.utc),  # Use timezone-aware datetime
            parameters={"model": "test", "size": "1024x1024"}
        )

        # Save metadata - this returns the ID string, not the object
        saved_id = await image_service.save_image_metadata(test_metadata)
        assert saved_id is not None
        assert isinstance(saved_id, str)
        assert saved_id == test_metadata.id

        # Retrieve metadata
        all_metadata = await image_service.get_all_image_metadata(limit=10)
        assert len(all_metadata) == 1
        assert all_metadata[0].prompt == "Test image"
        assert all_metadata[0].filename == "test_image.png"

        # Test getting filename by ID (the available function)
        filename = await image_service.get_image_filename_by_id(saved_id)
        assert filename is not None
        assert filename == "test_image.png"

    finally:
        # Restore original settings
        settings.storage_dir = original_storage_dir
