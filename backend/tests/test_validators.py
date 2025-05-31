"""Tests for validators module."""

import pytest

from backend.app.schemas.validators import (
    validate_model_quality,
    validate_model_size,
    validate_model_n,
    get_default_values_for_model,
    QUALITY_VALUES,
    SIZE_VALUES,
)


class TestQualityValidator:
    """Test cases for validate_model_quality function."""
    
    def test_valid_quality_values(self):
        """Test all valid quality values."""
        for quality in QUALITY_VALUES:
            result = validate_model_quality(quality, None)
            assert result == quality
    
    def test_invalid_quality_value(self):
        """Test invalid quality value raises ValueError."""
        with pytest.raises(ValueError) as exc_info:
            validate_model_quality("ultra", None)
        
        assert "Invalid quality 'ultra'" in str(exc_info.value)
        assert "auto" in str(exc_info.value)
        assert "low" in str(exc_info.value)
        assert "medium" in str(exc_info.value)
        assert "high" in str(exc_info.value)
    
    def test_empty_quality(self):
        """Test empty quality value."""
        with pytest.raises(ValueError):
            validate_model_quality("", None)
    
    def test_none_quality(self):
        """Test None quality value."""
        with pytest.raises(ValueError) as exc_info:
            validate_model_quality(None, None)
        
        assert "Invalid quality 'None'" in str(exc_info.value)


class TestSizeValidator:
    """Test cases for validate_model_size function."""
    
    def test_valid_size_values(self):
        """Test all valid size values."""
        for size in SIZE_VALUES:
            result = validate_model_size(size, None)
            assert result == size
    
    def test_invalid_size_value(self):
        """Test invalid size value raises ValueError."""
        with pytest.raises(ValueError) as exc_info:
            validate_model_size("512x512", None)
        
        assert "Invalid size '512x512'" in str(exc_info.value)
        assert "1024x1024" in str(exc_info.value)
        assert "1792x1024" in str(exc_info.value)
        assert "1024x1792" in str(exc_info.value)
    
    def test_malformed_size(self):
        """Test malformed size values."""
        invalid_sizes = ["1024", "x1024", "1024x", "1024-1024", "large"]
        for size in invalid_sizes:
            with pytest.raises(ValueError):
                validate_model_size(size, None)


class TestNValidator:
    """Test cases for validate_model_n function."""
    
    def test_valid_n_values(self):
        """Test valid n values (1-10)."""
        for n in range(1, 11):
            result = validate_model_n(n, None)
            assert result == n
    
    def test_n_too_small(self):
        """Test n value below minimum."""
        with pytest.raises(ValueError) as exc_info:
            validate_model_n(0, None)
        
        assert "must be between 1 and 10" in str(exc_info.value)
        assert "You provided: 0" in str(exc_info.value)
    
    def test_n_too_large(self):
        """Test n value above maximum."""
        with pytest.raises(ValueError) as exc_info:
            validate_model_n(11, None)
        
        assert "must be between 1 and 10" in str(exc_info.value)
        assert "You provided: 11" in str(exc_info.value)
    
    def test_negative_n(self):
        """Test negative n value."""
        with pytest.raises(ValueError) as exc_info:
            validate_model_n(-5, None)
        
        assert "must be between 1 and 10" in str(exc_info.value)
    
    def test_large_n(self):
        """Test very large n value."""
        with pytest.raises(ValueError) as exc_info:
            validate_model_n(100, None)
        
        assert "must be between 1 and 10" in str(exc_info.value)


class TestDefaultValues:
    """Test cases for get_default_values_for_model function."""
    
    def test_gpt_image_1_defaults(self):
        """Test default values for gpt-image-1 model."""
        defaults = get_default_values_for_model("gpt-image-1")
        
        assert defaults["quality"] == "auto"
        assert defaults["size"] == "1024x1024"
        assert defaults["n"] == 1
    
    def test_unknown_model_defaults(self):
        """Test default values for unknown model."""
        defaults = get_default_values_for_model("unknown-model")
        
        assert defaults == {}
    
    def test_empty_model_name(self):
        """Test default values for empty model name."""
        defaults = get_default_values_for_model("")
        
        assert defaults == {}
    
    def test_none_model_name(self):
        """Test default values for None model name."""
        defaults = get_default_values_for_model(None)
        
        assert defaults == {}