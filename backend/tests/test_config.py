import importlib
import os
import pytest

# Ensure settings can be imported even if OPENAI_API_KEY isn't defined by
# setting a temporary default. The value will be overwritten by tests.
os.environ.setdefault("OPENAI_API_KEY", "test-api-key")
from backend.app.core.settings import settings


def test_config_forwards_settings_values(monkeypatch):
    # Patch settings values
    test_api_key = "test-api-key"
    test_origins = ["https://test.com", "http://localhost:3000"]
    monkeypatch.setattr(settings, "openai_api_key", test_api_key)
    monkeypatch.setattr(settings, "allowed_origins", test_origins)

    # Reload config module and check for deprecation warning
    with pytest.warns(DeprecationWarning):
        config = importlib.reload(importlib.import_module("backend.app.config"))

    # Assert that config module forwards settings values
    assert config.OPENAI_API_KEY == test_api_key
    assert config.ALLOWED_ORIGINS == test_origins 