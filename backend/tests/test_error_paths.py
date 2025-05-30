"""Error-path tests to ensure API returns expected HTTP status codes when
invalid input or internal failures occur.
"""

import pytest


# ---------------------------------------------------------------------------
# /api/images validation
# ---------------------------------------------------------------------------


def test_images_invalid_limit(client):
    """limit must be >=1 – 0 should raise a 422 validation error."""

    resp = client.get("/api/images", params={"limit": 0})
    assert resp.status_code == 422


def test_images_invalid_offset(client):
    """offset must be >=0 – negative should raise 422."""

    resp = client.get("/api/images", params={"offset": -5})
    assert resp.status_code == 422