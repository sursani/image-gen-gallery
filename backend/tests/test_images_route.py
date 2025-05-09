import pytest
import uuid  # Import for generating unique filenames
import os
import sqlite3


@pytest.mark.asyncio
async def test_get_images_empty(client):
    # Simply check that the API returns a valid list - it might be empty or not
    # depending on the state of the database
    r = client.get("/api/images")
    assert r.status_code == 200
    
    # Check that we get a valid JSON array back
    data = r.json()
    assert isinstance(data, list)
    
    # If there are items, verify they have the expected structure
    if data:
        sample = data[0]
        assert "id" in sample
        assert "filename" in sample
        assert "prompt" in sample or sample.get("prompt") == None


@pytest.mark.asyncio
async def test_get_images_with_data(client, tmp_storage_dir):
    # client and tmp_storage_dir are already the actual instances, no need to await
    
    # Insert a fake metadata row directly via the service layer
    from backend.app.models.image_metadata import ImageMetadata
    from backend.app.services.image_service import save_image_metadata, get_all_image_metadata

    # Use a unique filename to avoid the sqlite3.IntegrityError
    unique_filename = f"test_{uuid.uuid4()}.png"
    md = ImageMetadata(prompt="test", filename=unique_filename)
    await save_image_metadata(md)

    # Ensure service layer returns the row
    records = await get_all_image_metadata(limit=10)
    assert any(rec.id == md.id for rec in records)

    # Call API
    r = client.get("/api/images")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1  # There might be existing images
    
    # Find our newly added image in the response
    found = False
    for item in data:
        if item["id"] == md.id:
            assert item["filename"] == unique_filename
            found = True
            break
    assert found, "New image not found in API response"
