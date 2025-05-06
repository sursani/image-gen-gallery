from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
import logging
import os
from pathlib import Path
from fastapi.responses import FileResponse

from ..models.image_metadata import ImageMetadata
from ..services.image_service import (
    get_all_image_metadata,
    SortOrder,
    get_image_filename_by_id,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Storage path based on settings
from ..core.settings import settings

# Use Path for join and ensure the directory exists.
IMAGE_STORAGE_PATH = Path(settings.storage_dir) / "images"

@router.get("/", response_model=List[ImageMetadata])
async def get_images(
    limit: int = Query(10, ge=1, le=100, description="Number of images to return per page."),
    offset: int = Query(0, ge=0, description="Number of images to skip for pagination."),
    sort: SortOrder = Query("newest", description="Sort order: 'newest' or 'oldest'")
):
    """Retrieve a list of image metadata with pagination and sorting."""
    try:
        logger.info(
            f"Fetching images with limit={limit}, offset={offset}, sort='{sort}'"
        )
        metadata_list = await get_all_image_metadata(
            limit=limit, offset=offset, sort=sort
        )
        # The service function returns [] on error, which is acceptable here.
        # More specific error handling could be added if needed (e.g., raising 500)
        return metadata_list
    except Exception as e:
        # Catch unexpected errors during the request handling itself
        logger.error(f"Unexpected error in GET /images endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error retrieving image metadata.")

@router.get("/file/{filename}", response_class=FileResponse)
async def get_image_by_filename(filename: str):
    """Retrieve a specific image file by its filename."""
    try:
        logger.info(f"Attempting to retrieve image file by filename: {filename}")
        
        # Basic validation: ensure filename doesn't contain path separators
        if '/' in filename or '\\' in filename:
            logger.error(f"Invalid filename format detected: {filename}")
            raise HTTPException(status_code=400, detail="Invalid image reference")
            
        # Use the Path object for joining
        file_path = IMAGE_STORAGE_PATH / filename

        # Check existence using the Path object
        if not file_path.is_file():
            logger.error(f"Image file not found on disk: {file_path}")
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Determine media type based on file extension (simple approach)
        media_type = None
        # Use Path suffix for cleaner extension checking
        file_suffix = file_path.suffix.lower()
        if file_suffix == ".png":
            media_type = "image/png"
        elif file_suffix in [".jpg", ".jpeg"]:
            media_type = "image/jpeg"
        # Add more types if needed (webp, etc.)

        logger.info(f"Returning image file: {file_path}")
        # FileResponse can handle Path objects directly
        return FileResponse(path=file_path, media_type=media_type, filename=filename)

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions directly
        raise http_exc
    except Exception as e:
        # Catch unexpected errors during file retrieval
        logger.error(f"Unexpected error retrieving image file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error retrieving image file.")

@router.get("/{image_id}", response_class=FileResponse)
async def get_image_file(image_id: str):
    """Retrieve a specific image file by its ID."""
    try:
        logger.info(f"Attempting to retrieve image file for ID: {image_id}")
        filename = await get_image_filename_by_id(image_id)

        if not filename:
            logger.warning(f"Image ID not found: {image_id}")
            raise HTTPException(status_code=404, detail="Image not found")

        # Construct the full path to the image file
        # Ensure the path is secure and doesn't allow directory traversal
        # os.path.join helps, but validation on filename might be needed
        # depending on how filenames are generated/stored.
        # Basic validation: ensure filename doesn't contain path separators
        if '/' in filename or '\\' in filename:
             logger.error(f"Invalid filename format detected for ID {image_id}: {filename}")
             raise HTTPException(status_code=400, detail="Invalid image reference")
             
        # Use the Path object for joining
        file_path = IMAGE_STORAGE_PATH / filename

        # Check existence using the Path object
        if not file_path.is_file():
            logger.error(f"Image file not found on disk for ID {image_id}: {file_path}")
            # Although DB entry exists, file is missing - treat as not found or server error?
            # Let's return 404 for consistency from client perspective.
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Determine media type based on file extension (simple approach)
        media_type = None
        # Use Path suffix for cleaner extension checking
        file_suffix = file_path.suffix.lower()
        if file_suffix == ".png":
            media_type = "image/png"
        elif file_suffix in [".jpg", ".jpeg"]:
            media_type = "image/jpeg"
        # Add more types if needed (webp, etc.)

        logger.info(f"Returning image file: {file_path} for ID: {image_id}")
        # FileResponse can handle Path objects directly
        return FileResponse(path=file_path, media_type=media_type, filename=filename)

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions directly
        raise http_exc
    except Exception as e:
        # Catch unexpected errors during file retrieval
        logger.error(f"Unexpected error retrieving image file for ID {image_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error retrieving image file.") 