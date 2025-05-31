"""Comprehensive tests for openai_service module with mocked OpenAI client."""

import asyncio
import base64
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
import httpx
from openai import APIError, RateLimitError
from pathlib import Path
import os

from backend.app.services.openai_service import (
    generate_image_from_prompt,
    generate_image_from_prompt_stream,
    edit_image_from_prompt,
    edit_image_from_prompt_stream,
    save_image_from_base64,
    download_and_save_image,
)

# Test data
PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMB"
    "gPb+cc0AAAAASUVORK5CYII="
)


class MockEvent:
    """Mock event for streaming responses."""
    def __init__(self, event_type, **kwargs):
        self.type = event_type
        for key, value in kwargs.items():
            setattr(self, key, value)


class MockResponse:
    """Mock response object."""
    def __init__(self, output=None):
        self.output = output or []


class MockOutputItem:
    """Mock output item."""
    def __init__(self, result=None, type=None):
        self.result = result
        self.type = type


@pytest.mark.asyncio
async def test_generate_image_from_prompt_success(mocker, tmp_storage_dir):
    """Test successful image generation."""
    # Mock the OpenAI client
    mock_client = AsyncMock()
    mock_response = MockResponse([MockOutputItem(result=PNG_BASE64, type="image_generation_call")])
    mock_client.responses.create = AsyncMock(return_value=mock_response)
    
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    result, error = await generate_image_from_prompt(
        prompt="A test image",
        size="1024x1024",
        quality="auto",
        n=1
    )
    
    assert result is not None
    assert error is None
    assert len(result) == 1
    assert result[0] == PNG_BASE64
    
    # Verify the API was called correctly
    mock_client.responses.create.assert_called_once()


@pytest.mark.asyncio
async def test_generate_image_from_prompt_api_error(mocker):
    """Test API error handling."""
    mock_client = AsyncMock()
    # APIError takes message and request as parameters
    mock_request = MagicMock()
    mock_client.responses.create = AsyncMock(
        side_effect=APIError("Test API error", request=mock_request, body={})
    )
    
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    result, error = await generate_image_from_prompt("Test prompt")
    
    assert result is None
    assert error is None  # APIError returns (None, None)


@pytest.mark.asyncio 
async def test_generate_image_from_prompt_rate_limit(mocker):
    """Test rate limit error handling with retry."""
    mock_client = AsyncMock()
    
    # First call raises RateLimitError, second succeeds
    mock_response = MockResponse([MockOutputItem(result=PNG_BASE64)])
    mock_client.responses.create = AsyncMock(
        side_effect=[
            RateLimitError("Rate limit hit", response=MagicMock(status_code=429), body=None),
            mock_response
        ]
    )
    
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    result, error = await generate_image_from_prompt("Test prompt")
    
    assert result is not None
    assert len(result) == 1
    assert mock_client.responses.create.call_count == 2  # Called twice due to retry


@pytest.mark.asyncio
async def test_generate_image_from_prompt_timeout(mocker):
    """Test timeout error handling."""
    mock_client = AsyncMock()
    mock_client.responses.create = AsyncMock(
        side_effect=httpx.TimeoutException("Request timed out")
    )
    
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    with pytest.raises(httpx.TimeoutException):
        await generate_image_from_prompt("Test prompt")


@pytest.mark.asyncio
async def test_generate_image_from_prompt_stream_success(mocker):
    """Test successful streaming image generation."""
    mock_client = AsyncMock()
    
    # Create async generator for streaming
    async def mock_stream():
        yield MockEvent("response.in_progress")
        yield MockEvent("response.image_generation_call.generating")
        yield MockEvent("response.image_generation_call.partial_image", partial_image_b64="partial1")
        yield MockEvent("response.image_generation_call.partial_image", partial_image_b64="partial2")
        yield MockEvent(
            "response.completed",
            response=MockResponse([MockOutputItem(result=PNG_BASE64, type="image_generation_call")])
        )
    
    mock_client.responses.create = AsyncMock(return_value=mock_stream())
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    # Collect all events from the stream
    events = []
    async for event in generate_image_from_prompt_stream("Test prompt"):
        events.append(event)
    
    assert len(events) == 6  # 1 started + 1 progress + 1 generating + 2 partial + 1 final
    assert events[0]["type"] == "progress"
    assert events[0]["data"]["status"] == "started"
    assert events[2]["type"] == "progress"
    assert events[2]["data"]["status"] == "generating"
    assert events[3]["type"] == "partial_image"
    assert events[5]["type"] == "image"
    assert events[5]["data"] == PNG_BASE64


@pytest.mark.asyncio
async def test_generate_image_from_prompt_stream_error(mocker):
    """Test error handling in streaming."""
    mock_client = AsyncMock()
    
    async def mock_stream():
        yield MockEvent("response.in_progress")
        raise Exception("Stream error")
    
    mock_client.responses.create = AsyncMock(return_value=mock_stream())
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    events = []
    with pytest.raises(Exception):
        async for event in generate_image_from_prompt_stream("Test prompt"):
            events.append(event)
    
    assert len(events) >= 2  # At least started and progress events
    assert any(event["type"] == "error" for event in events)


@pytest.mark.asyncio
async def test_edit_image_from_prompt_success(mocker):
    """Test successful image editing."""
    mock_client = AsyncMock()
    mock_response = MockResponse([MockOutputItem(result=PNG_BASE64)])
    mock_client.responses.create = AsyncMock(return_value=mock_response)
    
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    test_image = base64.b64decode(PNG_BASE64)
    result = await edit_image_from_prompt(
        prompt="Edit this image",
        image_bytes=test_image,
        mask_bytes=None,
        size="1024x1024"
    )
    
    assert result is not None
    assert len(result) == 1
    assert result[0] == PNG_BASE64


@pytest.mark.asyncio
async def test_edit_image_from_prompt_with_mask(mocker):
    """Test image editing with mask."""
    mock_client = AsyncMock()
    mock_response = MockResponse([MockOutputItem(result=PNG_BASE64)])
    mock_client.responses.create = AsyncMock(return_value=mock_response)
    
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    test_image = base64.b64decode(PNG_BASE64)
    test_mask = base64.b64decode(PNG_BASE64)
    
    result = await edit_image_from_prompt(
        prompt="Edit with mask",
        image_bytes=test_image,
        mask_bytes=test_mask,
        size="1024x1024"
    )
    
    assert result is not None
    assert len(result) == 1
    
    # Verify the mask was included in the API call
    call_args = mock_client.responses.create.call_args[1]
    message_content = call_args["input"][0]["content"]
    assert len(message_content) == 3  # prompt + image + mask


@pytest.mark.asyncio
async def test_edit_image_from_prompt_stream_success(mocker):
    """Test successful streaming image editing."""
    mock_client = AsyncMock()
    
    async def mock_stream():
        yield MockEvent("response.in_progress")
        yield MockEvent("response.image_generation_call.generating")
        yield MockEvent(
            "response.completed",
            response=MockResponse([MockOutputItem(result=PNG_BASE64, type="image_generation_call")])
        )
    
    mock_client.responses.create = AsyncMock(return_value=mock_stream())
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    test_image = base64.b64decode(PNG_BASE64)
    events = []
    async for event in edit_image_from_prompt_stream("Edit prompt", test_image):
        events.append(event)
    
    assert len(events) == 4  # started + processing + generating + final image
    assert events[-1]["type"] == "image"
    assert events[-1]["data"] == PNG_BASE64


@pytest.mark.asyncio
async def test_save_image_from_base64_multiple_images(tmp_storage_dir):
    """Test saving multiple images from base64."""
    image_list = [PNG_BASE64, PNG_BASE64]
    
    metadata_list = await save_image_from_base64(
        image_data_list=image_list,
        prompt="Test prompt",
        revised_prompt="Revised prompt",
        parameters={"size": "512x512", "quality": "auto"}
    )
    
    assert metadata_list is not None
    assert len(metadata_list) == 2
    
    # Check files were created
    for metadata in metadata_list:
        file_path = Path(tmp_storage_dir) / "images" / metadata.filename
        assert file_path.exists()
        assert metadata.prompt == "Revised prompt"
        assert metadata.parameters["size"] == "512x512"


@pytest.mark.asyncio
async def test_save_image_from_base64_invalid_base64(tmp_storage_dir):
    """Test handling of invalid base64 data."""
    result = await save_image_from_base64(
        image_data_list=["invalid_base64"],
        prompt="Test",
        revised_prompt=None,
        parameters={}
    )
    
    assert result is None


@pytest.mark.asyncio
async def test_save_image_from_base64_io_error(mocker, tmp_storage_dir):
    """Test handling of IO errors during save."""
    # Mock aiofiles.open to raise IOError
    mocker.patch('aiofiles.open', side_effect=IOError("Disk full"))
    
    result = await save_image_from_base64(
        image_data_list=[PNG_BASE64],
        prompt="Test",
        revised_prompt=None,
        parameters={}
    )
    
    assert result is None


@pytest.mark.asyncio
async def test_download_and_save_image_http_error(mocker, tmp_storage_dir):
    """Test handling of HTTP errors during download."""
    class MockResponse:
        status_code = 404
        def raise_for_status(self):
            raise httpx.HTTPStatusError("Not found", request=None, response=self)
    
    async def mock_get(*args, **kwargs):
        return MockResponse()
    
    mocker.patch('httpx.AsyncClient.get', mock_get)
    
    result = await download_and_save_image(
        image_url="https://example.com/notfound.png",
        prompt="Test",
        revised_prompt=None,
        parameters={}
    )
    
    assert result is None


@pytest.mark.asyncio
async def test_download_and_save_image_network_error(mocker, tmp_storage_dir):
    """Test handling of network errors during download."""
    async def mock_get(*args, **kwargs):
        raise httpx.RequestError("Network error")
    
    mocker.patch('httpx.AsyncClient.get', mock_get)
    
    result = await download_and_save_image(
        image_url="https://example.com/image.png",
        prompt="Test",
        revised_prompt=None,
        parameters={}
    )
    
    assert result is None


@pytest.mark.asyncio
async def test_generate_image_unexpected_error(mocker):
    """Test handling of unexpected errors."""
    mock_client = AsyncMock()
    mock_client.responses.create = AsyncMock(side_effect=Exception("Unexpected"))
    
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    result, error = await generate_image_from_prompt("Test")
    
    assert result is None
    assert error is None


@pytest.mark.asyncio
async def test_edit_image_api_error(mocker):
    """Test API error handling in edit function."""
    mock_client = AsyncMock()
    mock_request = MagicMock()
    api_error = APIError(
        "Content policy violation", 
        request=mock_request,
        body={"error": {"message": "Content policy violation"}}
    )
    api_error.status_code = 400
    api_error.code = "content_policy_violation"
    api_error.message = "Content policy violation"
    api_error.body = {"error": {"message": "Content policy violation"}}
    
    mock_client.responses.create = AsyncMock(side_effect=api_error)
    
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    test_image = base64.b64decode(PNG_BASE64)
    result = await edit_image_from_prompt("Test", test_image)
    
    assert result is None


@pytest.mark.asyncio
async def test_stream_partial_image_missing_data(mocker):
    """Test handling of partial image events without data."""
    mock_client = AsyncMock()
    
    async def mock_stream():
        yield MockEvent("response.in_progress")
        # Partial image event without partial_image_b64 attribute
        yield MockEvent("response.image_generation_call.partial_image")
        yield MockEvent(
            "response.completed",
            response=MockResponse([MockOutputItem(result=PNG_BASE64, type="image_generation_call")])
        )
    
    mock_client.responses.create = AsyncMock(return_value=mock_stream())
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    events = []
    async for event in generate_image_from_prompt_stream("Test"):
        events.append(event)
    
    # Should still complete successfully
    assert events[-1]["type"] == "image"
    assert events[-1]["data"] == PNG_BASE64


@pytest.mark.asyncio 
async def test_stream_completed_no_image(mocker):
    """Test handling of completed event without image data."""
    mock_client = AsyncMock()
    
    async def mock_stream():
        yield MockEvent("response.in_progress")
        # Completed event without proper image data
        yield MockEvent("response.completed", response=MockResponse([]))
    
    mock_client.responses.create = AsyncMock(return_value=mock_stream())
    mocker.patch('backend.app.services.openai_service.client', mock_client)
    
    events = []
    async for event in generate_image_from_prompt_stream("Test"):
        events.append(event)
    
    # Should complete but without final image
    assert not any(event["type"] == "image" for event in events)


@pytest.mark.asyncio
async def test_save_image_cleanup_on_error(mocker, tmp_storage_dir):
    """Test error handling during save."""
    # Mock base64 decode to fail
    mocker.patch('base64.b64decode', side_effect=Exception("Decode error"))
    
    result = await save_image_from_base64(
        image_data_list=[PNG_BASE64],
        prompt="Test",
        revised_prompt=None,
        parameters={}
    )
    
    assert result is None