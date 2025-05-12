"""
Validators for OpenAI parameters to ensure correct image generation parameters.
"""

from typing import Any, Dict
from pydantic import ValidationInfo

# Quality values for gpt-image-1
QUALITY_VALUES = ["auto", "low", "medium", "high"]

# Size values for gpt-image-1
SIZE_VALUES = ["1024x1024", "1792x1024", "1024x1792"]

def validate_model_quality(quality: str, info: ValidationInfo) -> str:
    """Validate that the quality is valid for gpt-image-1."""
    if quality not in QUALITY_VALUES:
        valid_list = ", ".join(f"'{q}'" for q in QUALITY_VALUES)
        raise ValueError(f"Invalid quality '{quality}' for gpt-image-1. Valid values are: {valid_list}")
    
    return quality

def validate_model_size(size: str, info: ValidationInfo) -> str:
    """Validate that the size is valid for gpt-image-1."""
    if size not in SIZE_VALUES:
        valid_list = ", ".join(f"'{s}'" for s in SIZE_VALUES)
        raise ValueError(f"Invalid size '{size}' for gpt-image-1. Valid values are: {valid_list}")
    
    return size

def validate_model_n(n: int, info: ValidationInfo) -> int:
    """Validate that n is within the allowed range for gpt-image-1."""
    if n < 1 or n > 10:
        raise ValueError(f"The number of images (n) must be between 1 and 10. You provided: {n}")
    
    return n

def validate_model_style(style: str, info: ValidationInfo) -> str:
    """Validate that the style is valid for the selected model."""
    # Get the model value from the input data
    model = info.data.get("model")
    if not model or not style:
        return style  # Missing data, let other validators handle it
    
    # Style is only supported for DALL-E 3
    if model != "dall-e-3" and style:
        raise ValueError(f"The 'style' parameter is only supported for the 'dall-e-3' model, not '{model}'.")
    
    # For DALL-E 3, style must be "vivid" or "natural"
    if model == "dall-e-3" and style not in ["vivid", "natural"]:
        raise ValueError(f"Invalid style '{style}' for model 'dall-e-3'. Valid values are: 'vivid', 'natural'.")
    
    return style

def get_default_values_for_model(model: str) -> Dict[str, Any]:
    """Get default values for a specific model."""
    defaults = {
        "gpt-image-1": {
            "quality": "auto",
            "size": "1024x1024",
            "n": 1
        },
        "dall-e-3": {
            "quality": "standard",
            "size": "1024x1024",
            "style": "vivid",
            "n": 1
        },
        "dall-e-2": {
            "size": "1024x1024",
            "n": 1
        }
    }
    return defaults.get(model, {}) 