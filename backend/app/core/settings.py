"""Project-wide configuration handled with *pydantic-settings*.

Environment variables are read from a `.env` file at the repo root (if
present) as well as the process environment.  All modules should import

    from backend.app.core.settings import settings

and use the exposed `Settings` instance instead of reading `os.getenv`
directly.
"""

from __future__ import annotations

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for back-end service."""

    # ---- OpenAI ---------------------------------------------------------

    openai_api_key: str
    image_model: str = "gpt-image-1"

    # ---- storage --------------------------------------------------------

    storage_dir: str = "backend/local_storage"
    db_filename: str = "image_metadata.db"

    # ---- CORS -----------------------------------------------------------

    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # ---- logging --------------------------------------------------------

    log_level: str = "INFO"  # DEBUG, INFO, WARNING …
    log_format: str = "plain"  # "plain" or "json"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",  # variable names as is
        case_sensitive=False,
    )


# Singleton instance used across the project
settings = Settings()  # type: ignore[call-arg]
