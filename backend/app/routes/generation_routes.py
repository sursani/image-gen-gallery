from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import Optional
import logging
import json
import base64

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
            "model": "gpt-4o",
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
async def handle_generate_image_stream(request: GenerateImageRequest = Body(...)):
    """Handles streaming image generation requests."""
    logger.info(f"Received streaming image generation request for prompt: '{request.prompt}'")
    
    async def generate():
        """Generator function for SSE streaming."""
        collected_image_data = []
        try:
            async for chunk in openai_service.generate_image_from_prompt_stream(
                prompt=request.prompt,
                size=request.size,
                quality=request.quality,
                n=request.n
            ):
                # Send each chunk as Server-Sent Event
                if chunk["type"] == "progress":
                    # Send progress updates
                    event_data = json.dumps({
                        "type": "progress",
                        "data": chunk["data"]
                    })
                    yield f"data: {event_data}\n\n"
                elif chunk["type"] == "image":
                    # Collect image data for saving
                    collected_image_data.append(chunk["data"])
                    # Send partial image data (could be used for progressive rendering)
                    event_data = json.dumps({
                        "type": "partial_image",
                        "data": chunk["data"]
                    })
                    yield f"data: {event_data}\n\n"
                elif chunk["type"] == "error":
                    event_data = json.dumps({
                        "type": "error",
                        "error": chunk["error"]
                    })
                    yield f"data: {event_data}\n\n"
                    return
            
            # After streaming completes, save the images
            if collected_image_data:
                parameters = {
                    "model": "gpt-4o",
                    "size": request.size,
                    "quality": request.quality,
                    "n": request.n
                }
                saved_metadata_list = await openai_service.save_image_from_base64(
                    image_data_list=collected_image_data,
                    prompt=request.prompt,
                    revised_prompt=None,
                    parameters=parameters
                )
                
                if saved_metadata_list:
                    # Send final metadata
                    metadata_dict = saved_metadata_list[0].model_dump()
                    metadata_dict["timestamp"] = metadata_dict["timestamp"].isoformat()
                    event_data = json.dumps({
                        "type": "complete",
                        "metadata": metadata_dict,
                        "image_data": collected_image_data[0]  # Send full image
                    })
                    yield f"data: {event_data}\n\n"
                else:
                    event_data = json.dumps({
                        "type": "error",
                        "error": "Failed to save generated image"
                    })
                    yield f"data: {event_data}\n\n"
            
        except Exception as e:
            logger.error(f"Error in streaming generation: {e}")
            event_data = json.dumps({
                "type": "error", 
                "error": str(e)
            })
            yield f"data: {event_data}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    ) 