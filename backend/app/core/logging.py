"""Project-wide logging configuration."""

from __future__ import annotations

import logging
import logging.config

# Optional dependency
try:
    from pythonjsonlogger import json as jsonlogger  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    jsonlogger = None  # fallback to plain formatter only

from .settings import settings


def init_logging() -> None:
    """Configure root logger according to *settings*.

    Should be called **once**, before any other imports that might emit
    logs (ideally at the very top of backend/app/main.py).
    """

    level = settings.log_level.upper()

    plain_fmt = "% (asctime)s %(levelname)s [%(name)s] %(message)s".replace(" ", "")

    fmt_key = "json" if settings.log_format == "json" and jsonlogger else "plain"

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "plain": {"format": plain_fmt},
                "json": {"()": jsonlogger.JsonFormatter, "fmt": plain_fmt} if jsonlogger else {},
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": fmt_key,
                }
            },
            "root": {"level": level, "handlers": ["console"]},
        }
    )
