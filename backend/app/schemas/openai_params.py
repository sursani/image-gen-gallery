"""
Centralized Pydantic schemas for OpenAI image generation and editing parameters.
These serve as the single source of truth for valid parameter values.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Literal, Optional, List, Dict, Any

from .validators import validate_model_quality, validate_model_size, validate_model_n


# GPT-IMAGE-1 PARAMETERS
class GptImage1BaseParams(BaseModel):
    """Base parameters for the gpt-image-1 model."""
    model: Literal["gpt-image-1"] = Field(default="gpt-image-1", description="The OpenAI model to use for image generation.")
    quality: Literal["auto", "low", "medium", "high"] = Field(
        default="auto", 
        description="The quality setting to use for the image generation."
    )
    size: Literal["1024x1024", "1792x1024", "1024x1792"] = Field(
        default="1024x1024", 
        description="The size of the generated image. The default is 1024x1024."
    )
    n: int = Field(
        default=1, 
        ge=1, 
        le=10, 
        description="The number of images to generate. Must be between 1 and 10."
    )


class GptImage1GenerationParams(GptImage1BaseParams):
    """Parameters for generating images with the gpt-image-1 model."""
    prompt: str = Field(
        ..., 
        min_length=1,
        max_length=4000,
        description="The text prompt that guides the image generation."
    )


class GptImage1EditParams(GptImage1BaseParams):
    """Parameters for editing images with the gpt-image-1 model."""
    prompt: str = Field(
        ..., 
        min_length=1,
        max_length=4000,
        description="The text prompt that guides the image editing."
    )
    # Image and Mask are handled separately as they're file uploads
    # These aren't included in the schema since they come from Form/File data


# Request models for API routes
class GenerateImageRequest(BaseModel):
    """Request model for image generation."""
    prompt: str = Field(
        ..., 
        min_length=1,
        max_length=4000,
        description="The text prompt that guides the image generation."
    )
    model: Literal["gpt-image-1"] = Field(
        default="gpt-image-1", 
        description="The model to use for image generation. Only gpt-image-1 is supported."
    )
    quality: Literal["auto", "low", "medium", "high"] = Field(
        default="auto", 
        description="Quality setting for gpt-image-1: 'auto', 'low', 'medium', or 'high'."
    )
    size: Literal["1024x1024", "1792x1024", "1024x1792"] = Field(
        default="1024x1024", 
        description="The size of the generated image."
    )
    n: int = Field(
        default=1, 
        ge=1, 
        le=10, 
        description="The number of images to generate. Must be between 1 and 10."
    )


class EditImageRequest(BaseModel):
    """Request model for image editing. Note that image/mask data comes from Form/File upload."""
    prompt: str = Field(
        ..., 
        min_length=1,
        max_length=4000,
        description="The text prompt that guides the image editing."
    )
    model: Literal["gpt-image-1"] = Field(
        default="gpt-image-1", 
        description="The model to use for image editing. Only gpt-image-1 is supported."
    )
    size: Literal["1024x1024", "1792x1024", "1024x1792"] = Field(
        default="1024x1024", 
        description="The size of the edited image."
    )
    quality: Literal["auto", "low", "medium", "high"] = Field(
        default="auto", 
        description="Quality setting for gpt-image-1: 'auto', 'low', 'medium', or 'high'."
    )
    n: int = Field(
        default=1, 
        ge=1, 
        le=10, 
        description="The number of edited images to generate. Must be between 1 and 10."
    )


# DALL-E 3 PARAMETERS
class DallE3BaseParams(BaseModel):
    """Base parameters for the dall-e-3 model."""
    model: Literal["dall-e-3"] = Field(default="dall-e-3", description="The OpenAI model to use for image generation.")
    quality: Literal["standard", "hd"] = Field(
        default="standard", 
        description="The quality setting for the image generation. 'hd' creates more detailed images but costs more."
    )
    size: Literal["1024x1024", "1792x1024", "1024x1792"] = Field(
        default="1024x1024", 
        description="The size of the generated image. The default is 1024x1024."
    )
    style: Literal["vivid", "natural"] = Field(
        default="vivid", 
        description="The style of the generated image. 'vivid' is more intense colors, 'natural' is more realistic."
    )


class DallE3GenerationParams(DallE3BaseParams):
    """Parameters for generating images with the dall-e-3 model."""
    prompt: str = Field(
        ..., 
        min_length=1,
        max_length=4000,
        description="The text prompt that guides the image generation."
    )
    n: Literal[1] = Field(
        default=1, 
        description="The number of images to generate. DALL-E 3 only supports generating 1 image at a time."
    )


# DALL-E 2 PARAMETERS
class DallE2BaseParams(BaseModel):
    """Base parameters for the dall-e-2 model."""
    model: Literal["dall-e-2"] = Field(default="dall-e-2", description="The OpenAI model to use for image generation.")
    size: Literal["256x256", "512x512", "1024x1024"] = Field(
        default="1024x1024", 
        description="The size of the generated image. The default is 1024x1024."
    )


class DallE2GenerationParams(DallE2BaseParams):
    """Parameters for generating images with the dall-e-2 model."""
    prompt: str = Field(
        ..., 
        min_length=1,
        max_length=1000,
        description="The text prompt that guides the image generation."
    )
    n: int = Field(
        default=1, 
        ge=1, 
        le=10, 
        description="The number of images to generate. Must be between 1 and 10."
    )


class DallE2EditParams(DallE2BaseParams):
    """Parameters for editing images with the dall-e-2 model."""
    prompt: str = Field(
        ..., 
        min_length=1,
        max_length=1000,
        description="The text prompt that guides the image editing."
    )
    n: int = Field(
        default=1, 
        ge=1, 
        le=10, 
        description="The number of edited images to generate. Must be between 1 and 10."
    )
    # Image and Mask are handled separately as they're file uploads


# Create an empty __init__.py file to make this a proper Python package 