from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Optional, Literal
import logging

from ..services.openai_service import generate_image_from_prompt, save_image_from_base64
from ..models.image_metadata import ImageMetadata

router = APIRouter()
logger = logging.getLogger(__name__)

class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="The text prompt for image generation.")
    size: str = Field("1024x1024", description="The desired size (e.g., 1024x1024, 1792x1024, 1024x1792).")
    quality: str = Field("high", description="The quality setting: 'low', 'medium', 'high', or 'auto'.")
    # Add other potential parameters like style here if needed

@router.post("/", response_model=ImageMetadata)
async def handle_generate_image(request: GenerateRequest = Body(...)):
    """Handles image generation requests."""
    logger.info(f"Received image generation request for prompt: '{request.prompt}'")
    
    try:
        # 1. Generate image using OpenAI service
        image_data_list, revised_prompt = await generate_image_from_prompt(
            prompt=request.prompt,
            size=request.size,
            quality=request.quality
        )

        if not image_data_list:
            logger.error("OpenAI image generation failed after retries.")
            # Determine appropriate error based on potential APIError details if captured
            raise HTTPException(status_code=500, detail="Image generation failed.")

        # 2. Save the base64 image data and record metadata
        parameters = {"size": request.size, "quality": request.quality}
        saved_metadata_list = await save_image_from_base64(
            image_data_list=image_data_list,
            prompt=request.prompt,
            revised_prompt=revised_prompt,
            parameters=parameters
        )

        if not saved_metadata_list:
            logger.error("Failed to save the generated image.")
            raise HTTPException(status_code=500, detail="Failed to process generated image.")

        # Return the first image metadata (we're only generating one image for now)
        saved_metadata = saved_metadata_list[0]
        logger.info(f"Successfully generated and saved image. Metadata ID: {saved_metadata.id}")
        return saved_metadata
        
    except HTTPException as http_exc:
        # Re-raise HTTPExceptions
        raise http_exc
    except Exception as e:
        # Catch any other unexpected errors during the process
        logger.error(f"Unexpected error handling image generation request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during image generation.") 