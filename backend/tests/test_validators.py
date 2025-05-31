"""Unit-tests for the standalone validation helpers in
*backend.app.schemas.validators* – these run independently of Pydantic
models so they are very fast and do not touch external resources.
"""

import pytest


from backend.app.schemas import validators as v


# ---------------------------------------------------------------------------
# validate_model_quality
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("good", ["auto", "low", "medium", "high"])
def test_validate_model_quality_accepts_valid(good):
    # The *info* parameter is unused in the implementation, we can pass None.
    assert v.validate_model_quality(good, None) == good


@pytest.mark.parametrize("bad", ["wrong", "AUTO", "hi"])
def test_validate_model_quality_rejects_invalid(bad):
    with pytest.raises(ValueError):
        v.validate_model_quality(bad, None)


# ---------------------------------------------------------------------------
# validate_model_size
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("good", ["1024x1024", "1792x1024", "1024x1792"])
def test_validate_model_size_accepts_valid(good):
    assert v.validate_model_size(good, None) == good


@pytest.mark.parametrize("bad", ["800x800", "1024", "1792*1024"])
def test_validate_model_size_rejects_invalid(bad):
    with pytest.raises(ValueError):
        v.validate_model_size(bad, None)


# ---------------------------------------------------------------------------
# validate_model_n
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("n", [1, 5, 10])
def test_validate_model_n_accepts_valid(n):
    assert v.validate_model_n(n, None) == n


@pytest.mark.parametrize("n", [0, -1, 11, 99])
def test_validate_model_n_rejects_out_of_range(n):
    with pytest.raises(ValueError):
        v.validate_model_n(n, None)


# ---------------------------------------------------------------------------
# get_default_values_for_model
# ---------------------------------------------------------------------------


def test_get_default_values_for_model_known_keys():
    defaults = v.get_default_values_for_model("gpt-image-1")
    # Ensure expected keys exist
    assert defaults["size"] == "1024x1024"
    assert defaults["quality"] == "auto"


def test_get_default_values_for_model_unknown():
    assert v.get_default_values_for_model("non-existent-model") == {}


# ---------------------------------------------------------------------------
# validate_model_style – new edge-cases
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "model,style",
    [
        ("gpt-image-1", "vivid"),  # style not supported on this model
        ("dall-e-2", "vivid"),
    ],
)
def test_validate_model_style_rejects_wrong_model(model, style):
    with pytest.raises(ValueError):
        v.validate_model_style(style, type("VI", (), {"data": {"model": model}})())


def test_validate_model_style_invalid_choice():
    """Invalid style for dall-e-3 should raise."""

    info = type("VI", (), {"data": {"model": "dall-e-3"}})()
    with pytest.raises(ValueError):
        v.validate_model_style("funky", info)


@pytest.mark.parametrize("style", ["vivid", "natural"])
def test_validate_model_style_accepts_valid(style):
    info = type("VI", (), {"data": {"model": "dall-e-3"}})()
    assert v.validate_model_style(style, info) == style

