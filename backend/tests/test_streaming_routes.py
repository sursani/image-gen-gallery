import base64
import json
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture(autouse=True)
def mock_openai_client(mocker):
    """Mock the entire OpenAI client to prevent any real API calls."""
    # Mock the client.responses.create method
    mock_client = mocker.patch("backend.app.services.openai_service.client")
    
    # For streaming responses
    class MockStreamResponse:
        def __aiter__(self):
            return self
        
        async def __anext__(self):
            # Stop iteration after yielding nothing
            raise StopAsyncIteration
    
    # Make the create method async and return the mock stream
    async def mock_create(*args, **kwargs):
        return MockStreamResponse()
    
    mock_client.responses.create.side_effect = mock_create
    
    # Also mock the streaming functions directly
    fake_png_b64 = base64.b64encode(b"PNGDATA").decode()
    fake_edited_b64 = base64.b64encode(b"EDITEDPNGDATA").decode()
    
    async def mock_generate_stream(*args, **kwargs):
        yield {"type": "progress", "data": "Starting generation"}
        yield {"type": "partial_image", "data": fake_png_b64[:100]}
        yield {"type": "image", "data": fake_png_b64}
    
    async def mock_edit_stream(*args, **kwargs):
        yield {"type": "progress", "data": "Starting edit"}
        yield {"type": "partial_image", "data": fake_edited_b64[:100]}
        yield {"type": "image", "data": fake_edited_b64}
    
    mocker.patch(
        "backend.app.services.openai_service.generate_image_from_prompt_stream",
        side_effect=mock_generate_stream
    )
    
    mocker.patch(
        "backend.app.services.openai_service.edit_image_from_prompt_stream", 
        side_effect=mock_edit_stream
    )


@pytest.mark.asyncio
async def test_generate_image_stream_ok(client):
    """Test streaming image generation endpoint."""
    response = client.post(
        "/api/generate/stream",
        json={
            "prompt": "streaming sunset over mountains",
            "size": "1024x1024",
            "quality": "auto"
        },
        headers={"Accept": "text/event-stream"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    
    # Parse SSE events
    events = []
    for line in response.text.split('\n'):
        if line.startswith('data: '):
            try:
                event_data = json.loads(line[6:])
                events.append(event_data)
            except json.JSONDecodeError:
                pass
    
    # Verify events
    assert len(events) >= 3
    assert events[0]["type"] == "progress"
    assert events[1]["type"] == "partial_image"
    assert events[-1]["type"] == "complete"
    assert "metadata" in events[-1]
    assert "image_data" in events[-1]


@pytest.mark.asyncio
async def test_generate_image_stream_error(client, mocker):
    """Test streaming error handling."""
    async def mock_stream_error(*args, **kwargs):
        yield {"type": "progress", "data": "Starting"}
        yield {"type": "error", "error": "API Error occurred"}
    
    mocker.patch(
        "backend.app.services.openai_service.generate_image_from_prompt_stream",
        side_effect=mock_stream_error
    )
    
    response = client.post(
        "/api/generate/stream",
        json={
            "prompt": "test error",
            "size": "1024x1024",
            "quality": "auto"
        },
        headers={"Accept": "text/event-stream"}
    )
    
    assert response.status_code == 200
    
    # Parse events
    events = []
    for line in response.text.split('\n'):
        if line.startswith('data: '):
            try:
                events.append(json.loads(line[6:]))
            except:
                pass
    
    # Should have error event
    error_events = [e for e in events if e.get("type") == "error"]
    assert len(error_events) > 0
    assert "error" in error_events[0]


@pytest.mark.asyncio
async def test_edit_image_stream_ok(client):
    """Test streaming image edit endpoint."""
    # Create test image file
    image_content = b"PNG_IMAGE_DATA"
    
    response = client.post(
        "/api/edit/stream",
        data={
            "prompt": "make it more colorful",
            "size": "1024x1024",
            "quality": "auto"
        },
        files={
            "image": ("test.png", image_content, "image/png")
        },
        headers={"Accept": "text/event-stream"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    
    # Parse events
    events = []
    for line in response.text.split('\n'):
        if line.startswith('data: '):
            try:
                events.append(json.loads(line[6:]))
            except:
                pass
    
    # Verify streaming events
    assert len(events) >= 3
    progress_events = [e for e in events if e.get("type") == "progress"]
    partial_events = [e for e in events if e.get("type") == "partial_image"]
    complete_events = [e for e in events if e.get("type") == "complete"]
    
    assert len(progress_events) > 0
    assert len(partial_events) > 0
    assert len(complete_events) == 1
    assert "metadata" in complete_events[0]


@pytest.mark.asyncio
async def test_edit_image_stream_with_mask(client):
    """Test streaming image edit with mask."""
    image_content = b"PNG_IMAGE_DATA"
    mask_content = b"PNG_MASK_DATA"
    
    response = client.post(
        "/api/edit/stream",
        data={
            "prompt": "replace the sky",
            "size": "1024x1024"
        },
        files={
            "image": ("test.png", image_content, "image/png"),
            "mask": ("mask.png", mask_content, "image/png")
        }
    )
    
    assert response.status_code == 200
    
    # Parse all events
    events = []
    for line in response.text.split('\n'):
        if line.startswith('data: '):
            try:
                events.append(json.loads(line[6:]))
            except:
                pass
    
    # Find complete event
    complete_events = [e for e in events if e.get("type") == "complete"]
    assert len(complete_events) == 1
    assert complete_events[0]["metadata"]["parameters"]["type"] == "edit"


@pytest.mark.asyncio
async def test_stream_cancellation(client, mocker):
    """Test that streaming can be cancelled/interrupted."""
    # This is more of a conceptual test since we can't truly test
    # client-side cancellation in this setup
    cancelled = False
    
    async def mock_stream_long(*args, **kwargs):
        for i in range(10):
            if cancelled:
                break
            yield {"type": "progress", "data": f"Step {i}"}
        yield {"type": "error", "error": "Cancelled"}
    
    mocker.patch(
        "backend.app.services.openai_service.generate_image_from_prompt_stream",
        side_effect=mock_stream_long
    )
    
    response = client.post(
        "/api/generate/stream",
        json={"prompt": "test", "size": "1024x1024", "quality": "auto"}
    )
    
    # In real scenario, client would close connection
    assert response.status_code == 200