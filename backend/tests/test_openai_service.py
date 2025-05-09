"""Direct unit tests for helper functions in openai_service.

These do not call the real OpenAI service – network interactions are
mocked.
"""

import base64
from pathlib import Path

import pytest


PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMB"
    "gPb+cc0AAAAASUVORK5CYII="
)


@pytest.mark.asyncio
async def test_save_image_from_base64(tmp_storage_dir):
    """save_image_from_base64 should create a file and return metadata."""

    from backend.app.services.openai_service import save_image_from_base64

    metas = await save_image_from_base64(
        image_data_list=[PNG_BASE64],
        prompt="p",
        revised_prompt=None,
        parameters={"size": "1024x1024"},
    )

    assert metas and len(metas) == 1
    meta = metas[0]
    file_path = Path(tmp_storage_dir) / "images" / meta.filename
    assert file_path.is_file()


@pytest.mark.asyncio
async def test_download_and_save_image(tmp_storage_dir, mocker):
    """download_and_save_image fetches an image via httpx and stores it."""

    from backend.app.services.openai_service import download_and_save_image

    # Mock httpx.AsyncClient.get so no real HTTP request occurs.
    class _Resp:
        status_code = 200

        def raise_for_status(self):
            pass

        content = base64.b64decode(PNG_BASE64)

    async def _fake_get(*args, **kwargs):
        return _Resp()

    mocker.patch("httpx.AsyncClient.get", _fake_get)

    meta = await download_and_save_image(
        image_url="https://example.com/fake.png",
        prompt="download",
        revised_prompt=None,
        parameters={},
    )

    assert meta is not None
    stored = Path(tmp_storage_dir) / "images" / meta.filename
    assert stored.is_file()
