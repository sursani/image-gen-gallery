"""Non-blocking SQLite helpers using ``asyncio.to_thread``.

The public API mirrors the previous synchronous implementation but each
function *awaits* the database interaction, which happens in a separate
thread so that the FastAPI event-loop is never blocked.
"""

from __future__ import annotations

import asyncio
import json
import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Literal

from ..core.settings import settings

from pydantic import ValidationError

from ..models.image_metadata import ImageMetadata

# ---------------------------------------------------------------------------
# Constants & logger
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)

SortOrder = Literal["newest", "oldest"]

# ---------------------------------------------------------------------------
# Helper functions to get paths dynamically
# ---------------------------------------------------------------------------

def _get_database_path() -> str:
    """Get the database path dynamically based on current settings."""
    base_dir = Path(settings.storage_dir).resolve()
    return str(base_dir / settings.db_filename)

# ---------------------------------------------------------------------------
# Internal helpers (run in a background thread)
# ---------------------------------------------------------------------------


def _connect() -> sqlite3.Connection:
    # Get database path dynamically
    database_path = _get_database_path()
    # Ensure parent directory exists (e.g. backend/local_storage)
    Path(database_path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(database_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# Public async API
# ---------------------------------------------------------------------------


async def initialize_database() -> None:
    """Create the *image_metadata* table if it does not exist."""

    def _init() -> None:
        conn = _connect()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS image_metadata (
                    id TEXT PRIMARY KEY,
                    prompt TEXT NOT NULL,
                    parameters TEXT,
                    filename TEXT NOT NULL UNIQUE,
                    timestamp DATETIME NOT NULL
                )
                """
            )
            conn.commit()
        finally:
            conn.close()

    await asyncio.to_thread(_init)
    logger.info("Database initialised at %s", _get_database_path())


async def save_image_metadata(metadata: ImageMetadata) -> str:
    """Insert *metadata* into the DB and return its id."""

    def _insert() -> str:
        conn = _connect()
        try:
            params = metadata.parameters
            if isinstance(params, dict):
                params = json.dumps(params)

            conn.execute(
                """
                INSERT INTO image_metadata (id, prompt, parameters, filename, timestamp)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    metadata.id,
                    metadata.prompt,
                    params,
                    metadata.filename,
                    metadata.timestamp.isoformat(),
                ),
            )
            conn.commit()
            return metadata.id
        finally:
            conn.close()

    return await asyncio.to_thread(_insert)


async def get_all_image_metadata(
    *,
    limit: int = 10,
    offset: int = 0,
    sort: SortOrder = "newest",
) -> List[ImageMetadata]:
    """Return paginated list of metadata rows without blocking the loop."""

    order_clause = "DESC" if sort == "newest" else "ASC"

    def _fetch() -> List[sqlite3.Row]:
        conn = _connect()
        try:
            cursor = conn.execute(
                f"SELECT id, prompt, parameters, filename, timestamp "
                f"FROM image_metadata ORDER BY timestamp {order_clause} LIMIT ? OFFSET ?",
                (limit, offset),
            )
            rows = cursor.fetchall()
            return rows
        finally:
            conn.close()

    rows = await asyncio.to_thread(_fetch)

    metadata_list: List[ImageMetadata] = []
    for row in rows:
        try:
            params_value = row["parameters"]
            if isinstance(params_value, str) and (
                params_value.startswith("{") or params_value.startswith("[")
            ):
                try:
                    params_value = json.loads(params_value)
                except json.JSONDecodeError:
                    logger.warning(
                        "Could not decode parameters JSON for image %s: %s",
                        row["id"],
                        params_value,
                    )

            metadata_list.append(
                ImageMetadata(
                    id=row["id"],
                    prompt=row["prompt"],
                    parameters=params_value,
                    filename=row["filename"],
                    timestamp=datetime.fromisoformat(row["timestamp"])
                    if isinstance(row["timestamp"], str)
                    else row["timestamp"],
                )
            )
        except ValidationError as exc:
            logger.error("Data validation error for row %s: %s", dict(row), exc)
        except Exception as exc:
            logger.error("Unexpected error processing row %s: %s", dict(row), exc)

    return metadata_list


async def get_image_filename_by_id(image_id: str) -> Optional[str]:
    """Return filename for *image_id* or None."""

    def _fetch_one() -> Optional[str]:
        conn = _connect()
        try:
            cur = conn.execute("SELECT filename FROM image_metadata WHERE id = ?", (image_id,))
            row = cur.fetchone()
            return row["filename"] if row else None
        finally:
            conn.close()

    return await asyncio.to_thread(_fetch_one)


# Expose connection helper for health check (async, non-blocking)


async def get_db_connection():  # type: ignore[return-type]
    """Return *sqlite3.Connection* in a background thread.

    This is only meant for quick health checks where callers immediately
    close the connection; it should not be used for request-time query
    work because that would block the loop.
    """

    return await asyncio.to_thread(_connect)
