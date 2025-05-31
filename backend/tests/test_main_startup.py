"""Tests for *app.main* startup/shutdown helpers.

We exercise both the **happy path** (no exception) and the **failure path**
where the injected *initialize_database* raises and the wrapper propagates the
error.  The function is *await*-able so we can call it directly instead of
boot-strapping the whole FastAPI app.
"""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_startup_db_success(mocker):
    """_startup_db awaits *initialize_database* exactly once."""

    from backend.app import main as m

    called = False

    async def _fake_init():  # noqa: D401
        nonlocal called
        called = True

    mocker.patch.object(m, "initialize_database", _fake_init)

    # Call the startup hook directly (no need for TestClient)
    await m._startup_db()  # type: ignore[attr-defined]

    assert called is True


@pytest.mark.asyncio
async def test_startup_db_failure_propagates(mocker):
    """If *initialize_database* raises, the wrapper should re-raise."""

    from backend.app import main as m

    async def _boom():  # noqa: D401
        raise RuntimeError("DB error")

    mocker.patch.object(m, "initialize_database", _boom)

    with pytest.raises(RuntimeError):
        await m._startup_db()  # type: ignore[attr-defined]
