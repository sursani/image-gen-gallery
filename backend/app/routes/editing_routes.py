from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Body
from pydantic import BaseModel, Field
from typing import Optional
import logging

from ..services.openai_service import edit_image_from_prompt, download_and_save_image
from ..models.image_metadata import ImageMetadata

router = APIRouter()
logger = logging.getLogger(__name__)

# Define allowed image types for upload
ALLOWED_IMAGE_TYPES = ["image/png"]
# Define max file size (e.g., 4MB, as required by DALL-E 2)
MAX_FILE_SIZE = 4 * 1024 * 1024 

@router.post("/", response_model=ImageMetadata)
async def handle_edit_image(
    prompt: str = Form(...),
    size: str = Form("1024x1024"), # Must be 256x256, 512x512, or 1024x1024 for dall-e-2
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None) 
):
    """Handles image editing requests with image and optional mask uploads."""
    logger.info(f"Received image edit request for prompt: '{prompt}'")

    # --- Input Validation --- 
    # Validate image size parameter
    if size not in ["256x256", "512x512", "1024x1024"]:
        raise HTTPException(status_code=400, detail=f"Invalid size '{size}'. Must be 256x256, 512x512, or 1024x1024.")

    # Validate image file
    if image.content_type not in ALLOWED_IMAGE_TYPES:
         raise HTTPException(status_code=400, detail=f"Invalid image file type: {image.content_type}. Must be PNG.")
    if image.size > MAX_FILE_SIZE:
         raise HTTPException(status_code=400, detail=f"Image file size exceeds limit ({MAX_FILE_SIZE} bytes).")

    # Validate mask file if provided
    mask_bytes: Optional[bytes] = None
    if mask:
        if mask.content_type not in ALLOWED_IMAGE_TYPES:
             raise HTTPException(status_code=400, detail=f"Invalid mask file type: {mask.content_type}. Must be PNG.")
        if mask.size > MAX_FILE_SIZE:
             raise HTTPException(status_code=400, detail=f"Mask file size exceeds limit ({MAX_FILE_SIZE} bytes).")
        mask_bytes = await mask.read()
        logger.info(f"Mask provided, size: {len(mask_bytes)} bytes")
    
    image_bytes = await image.read()
    logger.info(f"Image received, size: {len(image_bytes)} bytes")
    # Add further validation? e.g., check if image/mask are actually square using Pillow?
    # For now, we rely on OpenAI API to reject non-square images for edits.

    # --- API Call and Processing ---
    try:
        # 1. Edit image using OpenAI service
        edited_image_url = await edit_image_from_prompt(
            prompt=prompt,
            image_bytes=image_bytes,
            mask_bytes=mask_bytes,
            size=size 
        )

        if not edited_image_url:
            # Error logged within the service function
            raise HTTPException(status_code=500, detail="Image editing failed via OpenAI API.")

        # 2. Download, save the edited image, and record metadata
        parameters = {"size": size, "type": "edit", "original_prompt": prompt}
        saved_metadata = await download_and_save_image(
            image_url=edited_image_url,
            prompt=prompt, # Use the edit prompt for metadata
            revised_prompt=None, # Edits don't provide revised prompts
            parameters=parameters 
        )

        if not saved_metadata:
            logger.error("Failed to download or save the edited image.")
            raise HTTPException(status_code=500, detail="Failed to process edited image.")

        logger.info(f"Successfully edited and saved image. Metadata ID: {saved_metadata.id}")
        return saved_metadata
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error handling image edit request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during image editing.") 