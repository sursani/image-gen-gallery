"""BACKCOMPAT configuration module.

New code should *not* import from ``app.config`` but instead use

    from backend.app.core.settings import settings

This shim provides ``OPENAI_API_KEY`` and ``ALLOWED_ORIGINS`` so that
existing modules continue to run.  A *DeprecationWarning* is emitted at
import time.
"""

import warnings

from .core.settings import settings

warnings.warn(
    "backend.app.config is deprecated; use backend.app.core.settings instead",
    DeprecationWarning,
    stacklevel=2,
)

OPENAI_API_KEY = settings.openai_api_key
ALLOWED_ORIGINS = settings.allowed_origins