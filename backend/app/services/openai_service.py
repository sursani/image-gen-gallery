import logging
import httpx
import base64
from openai import AsyncOpenAI, APIError, RateLimitError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import asyncio
import aiofiles
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict, Any, AsyncIterator
import os

from ..core.settings import settings
from ..models.image_metadata import ImageMetadata
from .image_service import save_image_metadata  # Async version

logger = logging.getLogger(__name__)

from pathlib import Path


def _get_image_storage_path() -> Path:
    """Get the image storage path dynamically based on current settings."""
    return Path(settings.storage_dir) / "images"


# No additional helpers required – we assume the SDK function is asynchronous
# and therefore *must* be awaited.  Unit-test stubs should also be async.

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

async def generate_image_from_prompt_stream(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "auto",
    n: int = 1,
) -> AsyncIterator[Dict[str, Any]]:
    """Generate an image and stream intermediary events.

    Streams events from OpenAI's Responses API including progress updates
    and the final generated image.
    """

    logger.info(
        f"Requesting streaming image generation for prompt: '{prompt}' with size={size}, n={n}"
    )

    # Tell client we accepted the request
    yield {"type": "progress", "data": {"status": "started"}}

    try:
        # Map quality to OpenAI's expected values
        openai_quality = "standard" if quality == "auto" else quality
        
        # Stream using `stream=True` (SDK returns an async iterator)
        stream = await client.responses.create(
            model="gpt-4o",
            input=[{"type": "message", "role": "user", "content": prompt}],
            tools=[{
                "type": "image_generation",
                "size": size, 
                "quality": openai_quality,
                "partial_images": 3  # Request 3 partial images during generation
            }],
            stream=True,
        )

        partial_count = 0
        async for event in stream:
            ev_type = event.type
            
            # Log the event type for debugging
            logger.info(f"Received streaming event: type={ev_type}")

            # Handle progress events
            if ev_type == "response.in_progress":
                yield {"type": "progress", "data": {"status": "processing"}}
            elif ev_type == "response.image_generation_call.generating":
                yield {"type": "progress", "data": {"status": "generating"}}
            elif ev_type == "response.image_generation_call.partial_image":
                # Handle partial image events
                partial_count += 1
                logger.info(f"Received partial image {partial_count}")
                
                if hasattr(event, 'partial_image_b64'):
                    partial_data = event.partial_image_b64
                    yield {
                        "type": "partial_image",
                        "data": partial_data,
                        "index": partial_count
                    }
                else:
                    logger.warning("Partial image event missing image data")
            elif ev_type == "response.completed":
                # The final response contains the complete data including images
                logger.info("Streaming response completed - extracting image data")
                
                # Extract the response data
                if hasattr(event, 'response') and hasattr(event.response, 'output'):
                    for output_item in event.response.output:
                        # Look for image generation calls in the output
                        if (hasattr(output_item, 'type') and 
                            output_item.type == 'image_generation_call' and
                            hasattr(output_item, 'result')):
                            
                            logger.info("Found image generation call with result")
                            result = output_item.result
                            
                            # The result is the base64 image data string directly
                            if isinstance(result, str) and result:
                                logger.info(f"Found image data in result (length: {len(result)} chars)")
                                # Yield final image data
                                yield {
                                    "type": "image", 
                                    "data": result
                                }
                                return
                            else:
                                logger.warning(f"Result is not a string or is empty: {type(result)}, length: {len(result) if hasattr(result, '__len__') else 'N/A'}")
                
                # If no image found in the expected structure, log the response structure
                logger.warning("No image data found in completed response")
                if hasattr(event, 'response'):
                    logger.info(f"Response structure: {type(event.response)}")
                    if hasattr(event.response, 'output'):
                        logger.info(f"Output length: {len(event.response.output)}")
                        for i, item in enumerate(event.response.output):
                            logger.info(f"Output item {i}: type={getattr(item, 'type', 'unknown')}")
                            if hasattr(item, 'result'):
                                logger.info(f"  Result type: {type(item.result)}, length: {len(item.result) if hasattr(item.result, '__len__') else 'N/A'}")

        logger.info("Streaming response completed")

    except Exception as e:
        logger.error(f"Error during streaming image generation: {e}", exc_info=True)
        yield {"type": "error", "data": {"error": str(e)}}
        raise

@retry_strategy
async def generate_image_from_prompt(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "auto",
    n: int = 1,
) -> tuple[Optional[List[str]], Optional[str]]:
    """Generate an image using the Responses API.

    Uses the ``gpt-4o`` model with the hosted ``image_generation`` tool.
    """
    logger.info(
        f"Requesting image generation for prompt: '{prompt}' with size={size}, quality={quality}, n={n}"
    )
    try:
        # ---------------- Use OpenAI Responses API ----------------

        def _build_args() -> dict:
            return dict(
                model="gpt-4o",
                input=[{"type": "message", "role": "user", "content": prompt}],
                tools=[{
                    "type": "image_generation",
                    "size": size,
                }],
            )

        response = await client.responses.create(**_build_args())
        # Handle both SDK and legacy responses mock structure
        # The Responses API returns `output`, each with `.result` (base-64)
        if hasattr(response, "output"):
            image_data_list = [
                item.result for item in response.output if getattr(item, "result", None)
            ]
        else:
            image_data_list = []

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

async def edit_image_from_prompt_stream(
    prompt: str,
    image_bytes: bytes,
    mask_bytes: Optional[bytes] = None,
    size: str = "1024x1024",
    quality: str = "auto",
    n: int = 1,
) -> AsyncIterator[Dict[str, Any]]:
    """Edit an image using the Responses API with streaming.
    
    Yields chunks of data as they are received from the API.
    """
    logger.info(
        f"Requesting streaming image edit for prompt: '{prompt}' with size={size}, quality={quality}, n={n}"
    )
    try:
        # Tell client we accepted the request
        yield {"type": "progress", "data": {"status": "started"}}

        # Convert bytes to base64
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        mask_b64 = base64.b64encode(mask_bytes).decode("utf-8") if mask_bytes else None

        # Map quality to OpenAI's expected values
        openai_quality = "standard" if quality == "auto" else quality

        # Prepare input
        input_content = [
            {"type": "message", "role": "user", "content": prompt},
            {"type": "image", "image_url": f"data:image/png;base64,{image_b64}"}
        ]
        
        if mask_b64:
            input_content.append({"type": "image", "image_url": f"data:image/png;base64,{mask_b64}"})

        # Stream using the Responses API
        stream = await client.responses.create(
            model="gpt-4o",
            input=input_content,
            tools=[{
                "type": "image_generation",
                "size": size,
                "quality": openai_quality,
                "partial_images": 3  # Request partial images
            }],
            stream=True,
        )

        partial_count = 0
        async for event in stream:
            ev_type = event.type
            logger.info(f"Received streaming event: type={ev_type}")

            if ev_type == "response.in_progress":
                yield {"type": "progress", "data": {"status": "processing"}}
            elif ev_type == "response.image_generation_call.generating":
                yield {"type": "progress", "data": {"status": "generating"}}
            elif ev_type == "response.image_generation_call.partial_image":
                # Handle partial image events
                partial_count += 1
                logger.info(f"Received partial image {partial_count}")
                
                if hasattr(event, 'partial_image_b64'):
                    partial_data = event.partial_image_b64
                    yield {
                        "type": "partial_image",
                        "data": partial_data,
                        "index": partial_count
                    }
                else:
                    logger.warning("Partial image event missing image data")
            elif ev_type == "response.completed":
                # Extract final image
                if hasattr(event, 'response') and hasattr(event.response, 'output'):
                    for output_item in event.response.output:
                        if (hasattr(output_item, 'type') and 
                            output_item.type == 'image_generation_call' and
                            hasattr(output_item, 'result')):
                            
                            result = output_item.result
                            if isinstance(result, str) and result:
                                yield {"type": "image", "data": result}
                                return

    except Exception as e:
        logger.error(f"Error in streaming image edit: {e}")
        yield {
            "type": "error",
            "error": str(e)
        }

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
        # Build input content with base64 embedded images according to
        # Responses API image editing spec.

        content = [
            {"type": "input_text", "text": prompt},
            {
                "type": "input_image",
                "image_url": "data:image/png;base64," + base64.b64encode(image_bytes).decode(),
            },
        ]
        if mask_bytes:
            content.append(
                {
                    "type": "input_image",
                    "image_url": "data:image/png;base64," + base64.b64encode(mask_bytes).decode(),
                }
            )

        args = dict(
            model="gpt-4o",
            input=[{"type": "message", "role": "user", "content": content}],
            tools=[{
                "type": "image_generation",
                "size": size,
            }],
        )

        response = await client.responses.create(**args)

        if hasattr(response, "output"):
            image_data_list = [
                item.result for item in response.output if getattr(item, "result", None)
            ]
        else:
            image_data_list = []

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
        os.makedirs(_get_image_storage_path(), exist_ok=True)

        for idx, image_data in enumerate(image_data_list):
            # Decode base64 data
            image_bytes = base64.b64decode(image_data)
            
            # Generate a unique filename
            file_extension = ".png" # Default for gpt-image-1
            filename = f"{uuid.uuid4()}_{idx}{file_extension}"
            save_path = os.path.join(_get_image_storage_path(), filename)
            
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
            save_path = os.path.join(_get_image_storage_path(), metadata.filename)
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
        save_path = os.path.join(_get_image_storage_path(), filename)
        
        # Ensure the directory exists
        os.makedirs(_get_image_storage_path(), exist_ok=True)

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