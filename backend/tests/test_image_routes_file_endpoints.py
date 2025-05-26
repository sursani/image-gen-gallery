import pytest
import os
import uuid
from pathlib import Path
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_get_image_by_filename_success(client, tmp_storage_dir):
    """Test successful retrieval of an image by filename."""
    # Import settings to get the actual storage path
    from backend.app.core.settings import settings
    
    # Create a test image file in the correct location
    images_dir = Path(settings.storage_dir) / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    
    test_filename = "test_image.png"
    test_file_path = images_dir / test_filename
    test_file_path.write_bytes(b"fake png data")
    
    # Make request
    response = client.get(f"/api/images/file/{test_filename}")
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content == b"fake png data"
    
    # Clean up
    test_file_path.unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_get_image_by_filename_not_found(client, tmp_storage_dir):
    """Test 404 when image file doesn't exist."""
    response = client.get("/api/images/file/nonexistent.png")
    assert response.status_code == 404
    assert "Image file not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_image_by_filename_jpeg(client, tmp_storage_dir):
    """Test JPEG file retrieval with correct content type."""
    from backend.app.core.settings import settings
    
    images_dir = Path(settings.storage_dir) / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    
    test_filename = "test_image.jpg"
    test_file_path = images_dir / test_filename
    test_file_path.write_bytes(b"fake jpeg data")
    
    response = client.get(f"/api/images/file/{test_filename}")
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    
    # Clean up
    test_file_path.unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_get_image_file_by_id_success(client, tmp_storage_dir):
    """Test successful retrieval of an image by ID."""
    from backend.app.models.image_metadata import ImageMetadata
    from backend.app.services.image_service import save_image_metadata
    from backend.app.core.settings import settings
    
    # Create a test image file
    images_dir = Path(settings.storage_dir) / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    
    test_filename = f"test_{uuid.uuid4()}.png"
    test_file_path = images_dir / test_filename
    test_file_path.write_bytes(b"fake png data by id")
    
    # Save metadata
    metadata = ImageMetadata(prompt="test prompt", filename=test_filename)
    await save_image_metadata(metadata)
    
    # Make request
    response = client.get(f"/api/images/{metadata.id}")
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content == b"fake png data by id"
    
    # Clean up
    test_file_path.unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_get_image_file_by_id_not_found(client):
    """Test 404 when image ID doesn't exist."""
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/images/{fake_id}")
    assert response.status_code == 404
    assert "Image not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_image_file_by_id_file_missing(client, tmp_storage_dir):
    """Test 404 when metadata exists but file is missing."""
    from backend.app.models.image_metadata import ImageMetadata
    from backend.app.services.image_service import save_image_metadata
    
    # Save metadata without creating the actual file - use unique filename
    unique_filename = f"missing_file_{uuid.uuid4()}.png"
    metadata = ImageMetadata(prompt="test prompt", filename=unique_filename)
    await save_image_metadata(metadata)
    
    # Make request
    response = client.get(f"/api/images/{metadata.id}")
    
    assert response.status_code == 404
    assert "Image file not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_image_file_by_id_invalid_filename(client, tmp_storage_dir):
    """Test handling of invalid filename in metadata."""
    from backend.app.models.image_metadata import ImageMetadata
    from backend.app.services.image_service import save_image_metadata
    
    # Save metadata with invalid filename containing path separator - use unique pattern
    unique_invalid = f"../../../etc/passwd_{uuid.uuid4()}"
    metadata = ImageMetadata(prompt="test prompt", filename=unique_invalid)
    await save_image_metadata(metadata)
    
    # Make request
    response = client.get(f"/api/images/{metadata.id}")
    
    assert response.status_code == 400
    assert "Invalid image reference" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_images_with_pagination(client, tmp_storage_dir):
    """Test pagination parameters for get_images endpoint."""
    from backend.app.models.image_metadata import ImageMetadata
    from backend.app.services.image_service import save_image_metadata
    
    # Create multiple images with unique filenames
    for i in range(15):
        metadata = ImageMetadata(prompt=f"test {i}", filename=f"test_{i}_{uuid.uuid4()}.png")
        await save_image_metadata(metadata)
    
    # Test with limit
    response = client.get("/api/images?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data) <= 5
    
    # Test with offset
    response = client.get("/api/images?limit=5&offset=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) <= 5
    
    # Test with sort order
    response = client.get("/api/images?sort=oldest")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_images_error_handling(client):
    """Test error handling in get_images endpoint."""
    # Mock the service function to raise an exception
    with patch('backend.app.routes.image_routes.get_all_image_metadata', 
               side_effect=Exception("Database error")):
        response = client.get("/api/images")
        assert response.status_code == 500
        assert "Internal server error" in response.json()["detail"]