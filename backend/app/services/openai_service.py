import logging
import httpx
import base64
from openai import AsyncOpenAI, APIError, RateLimitError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import asyncio
import aiofiles
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict, Any, AsyncIterable
import os
import io

from ..core.settings import settings
from ..models.image_metadata import ImageMetadata
from .image_service import save_image_metadata  # Async version

logger = logging.getLogger(__name__)

from pathlib import Path


# Path to the directory where images will be stored (inside the storage
# dir specified in Settings).
IMAGE_STORAGE_PATH = Path(settings.storage_dir) / "images"

# Configure OpenAI client
# Consider using AsyncOpenAI for FastAPI
client = AsyncOpenAI(api_key=settings.openai_api_key)

# Define retry strategy for transient OpenAI API errors
retry_strategy = retry(
    stop=stop_after_attempt(3),  # Retry up to 3 times
    wait=wait_exponential(multiplier=1, min=2, max=10),  # Exponential backoff: 2s, 4s, 8s
    retry=retry_if_exception_type((RateLimitError, httpx.TimeoutException, httpx.NetworkError)),
    reraise=True # Re-raise the exception after the final attempt fails
)

@retry_strategy
async def generate_image_from_prompt(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "auto",
    n: int = 1,
) -> tuple[Optional[List[str]], Optional[str]]:
    """Generate an image using the Responses API.

    Only the ``gpt-image-1`` model is supported.
    """
    logger.info(
        f"Requesting image generation for prompt: '{prompt}' with size={size}, quality={quality}, n={n}"
    )
    try:
        input_items = [
            {"type": "message", "role": "user", "content": prompt}
        ]
        tool = {
            "type": "image_generation",
            "model": "gpt-image-1",
            "size": size,
            "quality": quality,
        }

        response = await client.responses.create(
            model="gpt-image-1",
            input=input_items,
            tools=[tool],
        )

        image_data_list = [
            output.result
            for output in response.output
            if getattr(output, "type", None) == "image_generation_call"
            and getattr(output, "result", None)
        ]

        logger.info(
            f"Image(s) generated successfully. Number of images: {len(image_data_list)}"
        )

        return image_data_list, None

    except RateLimitError as e:
        logger.warning(f"OpenAI rate limit hit during image generation: {e}. Retrying...")
        raise # Re-raise for tenacity to handle retries
    except APIError as e:
        logger.error(f"OpenAI API error during image generation: {e}")
        # Handle specific API errors (e.g., invalid prompt, content policy violation)
        return None, None
    except httpx.TimeoutException as e:
         logger.warning(f"OpenAI request timed out: {e}. Retrying...")
         raise # Re-raise for tenacity
    except httpx.NetworkError as e:
         logger.warning(f"Network error connecting to OpenAI: {e}. Retrying...")
         raise # Re-raise for tenacity
    except Exception as e:
        logger.error(f"Unexpected error during OpenAI image generation: {e}", exc_info=True)
        return None, None

@retry_strategy
async def edit_image_from_prompt(
    prompt: str,
    image_bytes: bytes,
    mask_bytes: Optional[bytes] = None,
    size: str = "1024x1024",
    quality: str = "auto",
    n: int = 1,
) -> Optional[List[str]]:
    """
    Edit an image using OpenAI's API with retry logic.

    Args:
        prompt: The text prompt describing the desired edit.
        image_bytes: The image data to edit (PNG format).
        mask_bytes: Optional mask data (PNG format) indicating areas to edit.
        size: The desired size of the edited image.
        quality: The quality setting (kept for compatibility, not used in edit API).
        n: The number of edited images to generate.

    Returns:
        A list of base64 encoded edited image data, or None on failure after retries.
    """
    logger.info(
        f"Requesting image edit for prompt: '{prompt}' with size={size}, quality={quality}, n={n}")
    try:
        input_items = [
            {"type": "message", "role": "user", "content": prompt},
            {
                "type": "input_image",
                "image_url": "data:image/png;base64," + base64.b64encode(image_bytes).decode(),
                "detail": "auto",
            },
        ]

        if mask_bytes:
            input_items.append(
                {
                    "type": "input_image",
                    "image_url": "data:image/png;base64," + base64.b64encode(mask_bytes).decode(),
                    "detail": "auto",
                }
            )

        tool = {
            "type": "image_generation",
            "model": "gpt-image-1",
            "size": size,
            "quality": quality,
        }

        response = await client.responses.create(
            model="gpt-image-1",
            input=input_items,
            tools=[tool],
        )

        image_data_list = [
            output.result
            for output in response.output
            if getattr(output, "type", None) == "image_generation_call"
            and getattr(output, "result", None)
        ]

        logger.info(
            f"Image(s) edited successfully. Number of images: {len(image_data_list)}"
        )
        return image_data_list

    except RateLimitError as e:
        logger.warning(f"OpenAI rate limit hit during image edit: {e}. Retrying...")
        raise # Re-raise for tenacity
    except APIError as e:
        # Log the specific API error details
        logger.error(f"OpenAI API error during image edit (prompt: '{prompt}'): Status={e.status_code}, Code={e.code}, Message={e.message}, Body={e.body}")
        return None # Return None on API errors
    except httpx.TimeoutException as e:
        logger.warning(f"OpenAI request timed out during image edit: {e}. Retrying...")
        raise # Re-raise for tenacity
    except httpx.NetworkError as e:
        logger.warning(f"Network error connecting to OpenAI during image edit: {e}. Retrying...")
        raise # Re-raise for tenacity
    except Exception as e:
        logger.error(f"Unexpected error during OpenAI image edit: {e}", exc_info=True)
        return None

async def generate_image_from_prompt_stream(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "auto",
    n: int = 1,
) -> AsyncIterable[dict]:
    """Stream image generation chunks from OpenAI.

    Yields dictionaries describing partial or final chunks. Each yielded item
    has at least a ``type`` field which is ``"partial"`` for incremental base64
    data or ``"complete"`` containing the final base64 string.
    """
    input_items = [{"type": "message", "role": "user", "content": prompt}]
    tool = {"type": "image_generation", "model": "gpt-image-1", "size": size, "quality": quality}

    try:
        stream = await client.responses.create(
            model="gpt-image-1",
            input=input_items,
            tools=[tool],
            stream=True,
        )

        async for chunk in stream:
            for output in getattr(chunk, "output", []):
                if getattr(output, "type", None) == "image_generation_chunk":
                    delta = getattr(output, "delta", None)
                    if delta and isinstance(delta, dict):
                        data = delta.get("data")
                        if data:
                            yield {"type": "partial", "data": data}
                elif getattr(output, "type", None) == "image_generation_call":
                    result = getattr(output, "result", None)
                    if result:
                        yield {"type": "complete", "data": result}
    except Exception as e:  # pragma: no cover - network errors handled upstream
        logger.error("Streaming image generation failed: %s", e)
        return


async def edit_image_from_prompt_stream(
    prompt: str,
    image_bytes: bytes,
    mask_bytes: Optional[bytes] = None,
    size: str = "1024x1024",
    quality: str = "auto",
    n: int = 1,
) -> AsyncIterable[dict]:
    """Stream image edit chunks from OpenAI."""

    input_items: List[dict] = [
        {"type": "message", "role": "user", "content": prompt},
        {
            "type": "input_image",
            "image_url": "data:image/png;base64," + base64.b64encode(image_bytes).decode(),
            "detail": "auto",
        },
    ]
    if mask_bytes:
        input_items.append(
            {
                "type": "input_image",
                "image_url": "data:image/png;base64," + base64.b64encode(mask_bytes).decode(),
                "detail": "auto",
            }
        )

    tool = {"type": "image_generation", "model": "gpt-image-1", "size": size, "quality": quality}

    try:
        stream = await client.responses.create(
            model="gpt-image-1",
            input=input_items,
            tools=[tool],
            stream=True,
        )
        async for chunk in stream:
            for output in getattr(chunk, "output", []):
                if getattr(output, "type", None) == "image_generation_chunk":
                    delta = getattr(output, "delta", None)
                    if delta and isinstance(delta, dict):
                        data = delta.get("data")
                        if data:
                            yield {"type": "partial", "data": data}
                elif getattr(output, "type", None) == "image_generation_call":
                    result = getattr(output, "result", None)
                    if result:
                        yield {"type": "complete", "data": result}
    except Exception as e:  # pragma: no cover
        logger.error("Streaming image edit failed: %s", e)
        return

async def save_image_from_base64(
    image_data_list: List[str],
    prompt: str,
    revised_prompt: Optional[str],
    parameters: dict # e.g., {'model': 'gpt-image-1', 'size': '1024x1024', 'quality': 'auto'}
) -> Optional[List[ImageMetadata]]:
    """
    Saves images from base64 encoded data locally and records their metadata.

    Args:
        image_data_list: List of base64 encoded image data strings.
        prompt: The original user prompt (or edit prompt).
        revised_prompt: The revised prompt from OpenAI (if any).
        parameters: Dictionary of generation/edit parameters used (model, size, quality, etc.).

    Returns:
        A list of saved ImageMetadata objects if successful, otherwise None.
    """
    metadata_list = []
    try:
        # Ensure the directory exists
        os.makedirs(IMAGE_STORAGE_PATH, exist_ok=True)

        for idx, image_data in enumerate(image_data_list):
            # Decode base64 data
            image_bytes = base64.b64decode(image_data)
            
            # Generate a unique filename
            file_extension = ".png" # Default for gpt-image-1
            filename = f"{uuid.uuid4()}_{idx}{file_extension}"
            save_path = os.path.join(IMAGE_STORAGE_PATH, filename)
            
            # Save the image content asynchronously
            async with aiofiles.open(save_path, 'wb') as f:
                await f.write(image_bytes)
            
            logger.info(f"Image {idx+1}/{len(image_data_list)} saved to: {save_path}")

            # Create and save metadata
            metadata = ImageMetadata(
                prompt=revised_prompt or prompt, # Use revised prompt if available
                parameters=parameters,
                filename=filename, # Store relative filename
                timestamp=datetime.now(timezone.utc)
                # id is generated by default
            )
            
            await save_image_metadata(metadata)  # async DB write
            metadata_list.append(metadata)
        
        return metadata_list

    except base64.binascii.Error as e:
        logger.error(f"Error decoding base64 image data: {e}")
        return None
    except IOError as e:
         logger.error(f"Error saving image file: {e}")
         return None
    except Exception as e:
        logger.error(f"Unexpected error saving image(s): {e}", exc_info=True)
        # Clean up partially saved files if any
        for metadata in metadata_list:
            save_path = os.path.join(IMAGE_STORAGE_PATH, metadata.filename)
            if os.path.exists(save_path):
                try:
                    os.remove(save_path)
                    logger.info(f"Cleaned up partially saved file: {save_path}")
                except OSError as rm_err:
                    logger.error(f"Error removing partially saved file {save_path}: {rm_err}")
        return None

# Keep the old download_and_save_image function for compatibility if needed
async def download_and_save_image(
    image_url: str,
    prompt: str,
    revised_prompt: Optional[str],
    parameters: dict # e.g., {'size': '1024x1024', 'type': 'edit'}
) -> Optional[ImageMetadata]:
    """
    Downloads an image from a URL, saves it locally, and records its metadata.
    (Modified slightly to potentially accommodate edit info in parameters)
    Args:
        image_url: The URL of the image to download.
        prompt: The original user prompt (or edit prompt).
        revised_prompt: The revised prompt from OpenAI (if any, unlikely for edits).
        parameters: Dictionary of generation/edit parameters used.

    Returns:
        The saved ImageMetadata object if successful, otherwise None.
    """
    save_path = "" # Initialize save_path
    try:
        # Generate a unique filename (e.g., UUID based)
        # Determine extension based on URL or response headers if possible, default to .png
        file_extension = ".png" # Default, OpenAI URLs often don't have extensions
        filename = f"{uuid.uuid4()}{file_extension}"
        save_path = os.path.join(IMAGE_STORAGE_PATH, filename)
        
        # Ensure the directory exists
        os.makedirs(IMAGE_STORAGE_PATH, exist_ok=True)

        # Use httpx.AsyncClient for async download
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(image_url, follow_redirects=True, timeout=30.0) # Increased timeout
            response.raise_for_status() # Raise exception for bad status codes

            # Save the image content asynchronously
            async with aiofiles.open(save_path, 'wb') as f:
                await f.write(response.content)
        
        logger.info(f"Image downloaded and saved to: {save_path}")

        # Create and save metadata
        metadata = ImageMetadata(
            prompt=revised_prompt or prompt, # Use revised prompt if available
            parameters=parameters,
            filename=filename, # Store relative filename
            timestamp=datetime.now(timezone.utc)
            # id is generated by default
        )
        
        await save_image_metadata(metadata)
        
        return metadata

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error downloading image from {image_url}: {e.response.status_code} - {e}")
        return None
    except httpx.RequestError as e:
        logger.error(f"Error during request to download image {image_url}: {e}")
        return None
    except IOError as e:
         logger.error(f"Error saving image file to {save_path}: {e}")
         return None
    except Exception as e:
        logger.error(f"Unexpected error downloading/saving image from {image_url}: {e}", exc_info=True)
        # Clean up partially saved file if it exists?
        if save_path and os.path.exists(save_path): # Check if save_path was set
             try:
                 os.remove(save_path)
                 logger.info(f"Cleaned up partially saved file: {save_path}")
             except OSError as rm_err:
                 logger.error(f"Error removing partially saved file {save_path}: {rm_err}")
        return None 