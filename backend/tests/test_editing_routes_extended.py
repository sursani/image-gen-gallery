import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import UploadFile
from io import BytesIO
from backend.app.models.image_metadata import ImageMetadata


class TestEditingRoutesValidation:
    """Test cases for editing routes validation functions."""
    
    @pytest.mark.asyncio
    async def test_validate_image_file_invalid_type(self, client):
        """Test validation rejects non-PNG files."""
        # Create a fake JPEG file
        file_content = b"fake jpeg content"
        file = BytesIO(file_content)
        
        response = client.post(
            "/api/edit/",
            data={"prompt": "test edit", "size": "1024x1024", "quality": "auto", "n": "1"},
            files={"image": ("test.jpg", file, "image/jpeg")}
        )
        
        assert response.status_code == 400
        assert "Invalid image file type" in response.json()["detail"]
        assert "Must be PNG" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_validate_image_file_too_large(self, client):
        """Test validation rejects files larger than 4MB."""
        # Create a file larger than 4MB
        large_content = b"x" * (4 * 1024 * 1024 + 1)
        file = BytesIO(large_content)
        
        response = client.post(
            "/api/edit/",
            data={"prompt": "test edit", "size": "1024x1024", "quality": "auto", "n": "1"},
            files={"image": ("test.png", file, "image/png")}
        )
        
        assert response.status_code == 400
        assert "Image file size exceeds limit" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_validate_mask_file_invalid_type(self, client):
        """Test mask validation rejects non-PNG files."""
        image_file = BytesIO(b"fake png")
        mask_file = BytesIO(b"fake jpeg")
        
        response = client.post(
            "/api/edit/",
            data={"prompt": "test edit", "size": "1024x1024", "quality": "auto", "n": "1"},
            files={
                "image": ("test.png", image_file, "image/png"),
                "mask": ("mask.jpg", mask_file, "image/jpeg")
            }
        )
        
        assert response.status_code == 400
        assert "Invalid mask file type" in response.json()["detail"]
        assert "Must be PNG" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_validate_mask_file_too_large(self, client):
        """Test mask validation rejects files larger than 4MB."""
        image_file = BytesIO(b"fake png")
        large_mask = BytesIO(b"x" * (4 * 1024 * 1024 + 1))
        
        response = client.post(
            "/api/edit/",
            data={"prompt": "test edit", "size": "1024x1024", "quality": "auto", "n": "1"},
            files={
                "image": ("test.png", image_file, "image/png"),
                "mask": ("mask.png", large_mask, "image/png")
            }
        )
        
        assert response.status_code == 400
        assert "Mask file size exceeds limit" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_edit_with_invalid_parameters(self, client):
        """Test edit with invalid request parameters."""
        image_file = BytesIO(b"fake png")
        
        response = client.post(
            "/api/edit/",
            data={"prompt": "test edit", "size": "invalid_size", "quality": "auto", "n": "1"},
            files={"image": ("test.png", image_file, "image/png")}
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_edit_success_with_mask(self, client):
        """Test successful edit with mask."""
        image_file = BytesIO(b"fake png image")
        mask_file = BytesIO(b"fake png mask")
        
        mock_metadata = ImageMetadata(
            prompt="test edit",
            filename="edited_image.png",
            parameters={"type": "edit"}
        )
        
        with patch('backend.app.routes.editing_routes.edit_image_from_prompt',
                   new_callable=AsyncMock,
                   return_value=["base64_edited_data"]):
            with patch('backend.app.routes.editing_routes.save_image_from_base64',
                       new_callable=AsyncMock,
                       return_value=[mock_metadata]):
                response = client.post(
                    "/api/edit/",
                    data={"prompt": "test edit", "size": "1024x1024", "quality": "auto", "n": "1"},
                    files={
                        "image": ("test.png", image_file, "image/png"),
                        "mask": ("mask.png", mask_file, "image/png")
                    }
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["prompt"] == "test edit"
                assert data["filename"] == "edited_image.png"
    
    @pytest.mark.asyncio
    async def test_edit_openai_failure(self, client):
        """Test handling when OpenAI edit fails."""
        image_file = BytesIO(b"fake png")
        
        with patch('backend.app.routes.editing_routes.edit_image_from_prompt',
                   new_callable=AsyncMock,
                   return_value=None):
            response = client.post(
                "/api/edit/",
                data={"prompt": "test edit", "size": "1024x1024", "quality": "auto", "n": "1"},
                files={"image": ("test.png", image_file, "image/png")}
            )
            
            assert response.status_code == 500
            assert "Image editing failed via OpenAI API" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_edit_save_failure(self, client):
        """Test handling when saving edited image fails."""
        image_file = BytesIO(b"fake png")
        
        with patch('backend.app.routes.editing_routes.edit_image_from_prompt',
                   new_callable=AsyncMock,
                   return_value=["base64_data"]):
            with patch('backend.app.routes.editing_routes.save_image_from_base64',
                       new_callable=AsyncMock,
                       return_value=None):
                response = client.post(
                    "/api/edit/",
                    data={"prompt": "test edit", "size": "1024x1024", "quality": "auto", "n": "1"},
                    files={"image": ("test.png", image_file, "image/png")}
                )
                
                assert response.status_code == 500
                assert "Failed to process edited image" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_edit_unexpected_error(self, client):
        """Test handling of unexpected errors during edit."""
        image_file = BytesIO(b"fake png")
        
        with patch('backend.app.routes.editing_routes.edit_image_from_prompt',
                   new_callable=AsyncMock,
                   side_effect=Exception("Unexpected error")):
            response = client.post(
                "/api/edit/",
                data={"prompt": "test edit", "size": "1024x1024", "quality": "auto", "n": "1"},
                files={"image": ("test.png", image_file, "image/png")}
            )
            
            assert response.status_code == 500
            assert "An unexpected error occurred" in response.json()["detail"]