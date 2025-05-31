"""Extended tests for *openai_service* covering generation and editing helpers.

Network calls to OpenAI and outbound HTTP downloads are fully mocked so the
tests run offline and deterministically.
"""

from __future__ import annotations

import base64
from types import SimpleNamespace

import pytest


# Produce distinct base-64 strings so we can verify the functions do not simply
# echo the input values.
PNG_DATA = base64.b64encode(b"PNGDATA").decode()
EDITED_PNG_DATA = base64.b64encode(b"EDITED").decode()

# ---------------------------------------------------------------------------
# generate_image_from_prompt – direct *b64_json* branch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_image_from_prompt_b64_success(mocker):
    """When the API returns *b64_json* the helper should forward it unchanged."""

    from backend.app.services import openai_service as svc

    class _Item:
        b64_json = PNG_DATA
        revised_prompt = "revised?"
        url = None

    async def _fake_generate(**kwargs):  # noqa: D401
        return SimpleNamespace(data=[_Item()])

    mocker.patch.object(svc.client.images, "generate", _fake_generate)

    images, revised = await svc.generate_image_from_prompt(prompt="abc")

    assert images == [PNG_DATA]
    assert revised == "revised?"


# ---------------------------------------------------------------------------
# edit_image_from_prompt – success without mask
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_edit_image_from_prompt_no_mask(mocker):
    from backend.app.services import openai_service as svc

    png_bytes = base64.b64decode(PNG_DATA)

    class _Item:
        b64_json = EDITED_PNG_DATA
        url = None

    async def _fake_edit(**kwargs):  # noqa: D401
        assert "mask" not in kwargs  # ensure we didn't send a mask
        return SimpleNamespace(data=[_Item()])

    mocker.patch.object(svc.client.images, "edit", _fake_edit)

    result = await svc.edit_image_from_prompt(
        prompt="do it",
        image_bytes=png_bytes,
        mask_bytes=None,
    )

    assert result == [EDITED_PNG_DATA]



# ---------------------------------------------------------------------------
# generate_image_from_prompt – URL fallback branch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_image_from_prompt_download_fallback(tmp_storage_dir, mocker):
    """When the OpenAI response contains *url* fields the helper should download
    the image and return base-64 encoded data.
    """

    from backend.app.services import openai_service as svc

    # 1. Mock *client.images.generate* to return an object whose *data* items
    #    only contain a *url* field (no *b64_json*).

    class _Item:  # noqa: D401 – simple stub
        url = "https://example.com/fake.png"
        b64_json = None
        revised_prompt = None

    async def _fake_generate(**kwargs):  # noqa: D401
        return SimpleNamespace(data=[_Item()])

    mocker.patch.object(svc.client.images, "generate", _fake_generate)

    # 2. Mock the HTTP download that the helper performs.

    class _Resp:
        status_code = 200

        def __init__(self, content: bytes):
            self.content = content

        async def __aenter__(self):  # For httpx.async_asgi style – not used
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    async def _fake_get(*args, **kwargs):  # noqa: D401
        return _Resp(base64.b64decode(PNG_DATA))

    mocker.patch("httpx.AsyncClient.get", _fake_get)

    # 3. Invoke the helper
    images, revised_prompt = await svc.generate_image_from_prompt(
        prompt="demo",
        size="1024x1024",
        quality="auto",
        n=1,
    )

    assert revised_prompt is None
    assert images == [PNG_DATA]


# ---------------------------------------------------------------------------
# edit_image_from_prompt – success path with mask
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_edit_image_from_prompt_with_mask(tmp_storage_dir, mocker):
    """The helper should return the decoded *b64_json* from the OpenAI response."""

    from backend.app.services import openai_service as svc

    # 1×1 PNG bytes for both image & mask
    png_bytes = base64.b64decode(PNG_DATA)

    class _Item:  # stub item with both attrs the code checks
        b64_json = EDITED_PNG_DATA
        url = None

    async def _fake_edit(**kwargs):  # noqa: D401
        # Ensure mask + image bytes are passed through correctly
        assert kwargs["image"][1] == png_bytes
        assert kwargs["mask"][1] == png_bytes
        return SimpleNamespace(data=[_Item()])

    mocker.patch.object(svc.client.images, "edit", _fake_edit)

    result = await svc.edit_image_from_prompt(
        prompt="make it blue",
        image_bytes=png_bytes,
        mask_bytes=png_bytes,
        size="1024x1024",
        quality="auto",
    )

    assert result == [EDITED_PNG_DATA]


# ---------------------------------------------------------------------------
# generate_image_from_prompt – RateLimitError triggers retries & propagates
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_image_from_prompt_rate_limit_error(mocker):
    """After exhausting retries the helper re-raises *RateLimitError*."""

    from backend.app.services import openai_service as svc

    # Force *client.images.generate* to raise the error every time.
    import httpx

    async def _always_fail(**kwargs):  # noqa: D401
        dummy_resp = httpx.Response(
            429,
            request=httpx.Request("GET", "https://api.openai.com")
        )
        raise svc.RateLimitError("rate limit", response=dummy_resp, body="")

    mocker.patch.object(svc.client.images, "generate", _always_fail)

    with pytest.raises(svc.RateLimitError):
        await svc.generate_image_from_prompt(prompt="boom")
