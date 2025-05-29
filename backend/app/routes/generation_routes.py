from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import Optional
import json
import logging

from ..services import openai_service
from ..models.image_metadata import ImageMetadata
from ..schemas import GenerateImageRequest

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=ImageMetadata)
async def handle_generate_image(request: GenerateImageRequest = Body(...)):
    """Handles image generation requests."""
    logger.info(f"Received image generation request for prompt: '{request.prompt}'")
    
    try:
        # 1. Generate image using OpenAI service
        image_data_list, revised_prompt = await openai_service.generate_image_from_prompt(
            prompt=request.prompt,
            size=request.size,
            quality=request.quality,
            n=request.n
        )

        if not image_data_list:
            logger.error("OpenAI image generation failed after retries.")
            # Determine appropriate error based on potential APIError details if captured
            raise HTTPException(status_code=500, detail="Image generation failed.")

        # 2. Save the base64 image data and record metadata
        parameters = {
            "model": "gpt-image-1",
            "size": request.size,
            "quality": request.quality,
            "n": request.n
        }
        saved_metadata_list = await openai_service.save_image_from_base64(
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


@router.post("/stream")
async def stream_generate_image(request: GenerateImageRequest = Body(...)):
    """Stream image generation chunks via SSE."""

    async def event_generator():
        accumulated = ""
        params = {"model": "gpt-image-1", "size": request.size, "quality": request.quality, "n": request.n}

        async for item in openai_service.generate_image_from_prompt_stream(
            prompt=request.prompt,
            size=request.size,
            quality=request.quality,
            n=request.n,
        ):
            if item.get("type") == "partial":
                accumulated += item.get("data", "")
                yield f"data: {json.dumps({'type': 'partial'})}\n\n"
            elif item.get("type") == "complete":
                accumulated += item.get("data", "")
                saved = await openai_service.save_image_from_base64(
                    [accumulated], request.prompt, None, params
                )
                meta = saved[0] if saved else None
                payload = {"type": "complete", "metadata": meta.model_dump() if meta else None}
                yield f"data: {json.dumps(payload)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
