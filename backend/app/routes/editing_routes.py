from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Body, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
import logging
import json
import base64

# Import the module instead of binding function objects so that monkey-patching
# in tests updates behaviour correctly.
from ..services import openai_service

# Re-export specific service helpers so that unit tests (and any external
# callers) can continue to patch `backend.app.routes.editing_routes.*` without
# needing to know the internal indirection.  These are thin pass-through
# references kept purely for compatibility.

edit_image_from_prompt_stream = openai_service.edit_image_from_prompt_stream
save_image_from_base64 = openai_service.save_image_from_base64
from ..models.image_metadata import ImageMetadata
from ..schemas import EditImageRequest

router = APIRouter()
logger = logging.getLogger(__name__)

# Define allowed image types for upload
ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"]
# Define max file size (e.g., 4MB, as required by DALL-E 2)
MAX_FILE_SIZE = 4 * 1024 * 1024 

async def validate_image_file(image: UploadFile) -> bytes:
    """Validate the image file and return its bytes if valid."""
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image file type: {image.content_type}. Must be PNG, JPEG, or JPG.",
        )

    image_bytes = await image.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Image file size exceeds limit ({MAX_FILE_SIZE} bytes).",
        )

    logger.info(f"Image received, size: {len(image_bytes)} bytes")
    return image_bytes

async def validate_mask_file(mask: Optional[UploadFile] = None) -> Optional[bytes]:
    """Validate the optional mask file and return its bytes if valid."""
    if not mask:
        return None

    if mask.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mask file type: {mask.content_type}. Must be PNG, JPEG, or JPG.",
        )

    mask_bytes = await mask.read()
    if len(mask_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Mask file size exceeds limit ({MAX_FILE_SIZE} bytes).",
        )

    logger.info(f"Mask provided, size: {len(mask_bytes)} bytes")
    return mask_bytes

@router.post("/stream")
async def handle_edit_image_stream(
    prompt: str = Form(...),
    size: str = Form("1024x1024"),
    quality: str = Form("auto"),
    n: int = Form(1),
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None)
):
    """Handles streaming image editing requests."""
    logger.info(f"Received streaming image edit request for prompt: '{prompt}'")

    # Validate request parameters
    try:
        edit_request = EditImageRequest(
            prompt=prompt,
            size=size,
            quality=quality,
            n=n
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Validate image and mask files
    image_bytes = await validate_image_file(image)
    mask_bytes = await validate_mask_file(mask)

    async def generate():
        """Generator function for SSE streaming."""
        collected_image_data = []
        partial_images = []
        try:
            async for chunk in openai_service.edit_image_from_prompt_stream(
                prompt=edit_request.prompt,
                image_bytes=image_bytes,
                mask_bytes=mask_bytes,
                size=edit_request.size,
                quality=edit_request.quality,
                n=edit_request.n
            ):
                # Send each chunk as Server-Sent Event
                if chunk["type"] == "progress":
                    event_data = json.dumps({
                        "type": "progress",
                        "data": chunk["data"]
                    })
                    yield f"data: {event_data}\n\n"
                elif chunk["type"] == "partial_image":
                    # Store partial images
                    partial_images.append(chunk["data"])
                    # Send partial image data for progressive rendering
                    event_data = json.dumps({
                        "type": "partial_image",
                        "data": chunk["data"],
                        "index": chunk.get("index", len(partial_images))
                    })
                    yield f"data: {event_data}\n\n"
                elif chunk["type"] == "image":
                    collected_image_data.append(chunk["data"])
                    # Send final complete image
                    event_data = json.dumps({
                        "type": "image",
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
                    "size": edit_request.size,
                    "quality": edit_request.quality,
                    "n": edit_request.n,
                    "type": "edit",
                    "original_prompt": edit_request.prompt
                }
                saved_metadata_list = await save_image_from_base64(
                    image_data_list=collected_image_data,
                    prompt=edit_request.prompt,
                    revised_prompt=None,
                    parameters=parameters
                )
                
                if saved_metadata_list:
                    metadata_dict = saved_metadata_list[0].model_dump()
                    metadata_dict["timestamp"] = metadata_dict["timestamp"].isoformat()
                    event_data = json.dumps({
                        "type": "complete",
                        "metadata": metadata_dict,
                        "image_data": collected_image_data[0]
                    })
                    yield f"data: {event_data}\n\n"
                else:
                    event_data = json.dumps({
                        "type": "error",
                        "error": "Failed to save edited image"
                    })
                    yield f"data: {event_data}\n\n"
            
        except Exception as e:
            logger.error(f"Error in streaming edit: {e}")
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
            "X-Accel-Buffering": "no"
        }
    ) 