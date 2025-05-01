import React, { useState } from 'react';
import Button from './Button';
import { generateImage } from '../api/imageGeneration';
import ErrorMessage from './ErrorMessage';

function ImageGenerationForm() {
  const [formState, setFormState] = useState({
    prompt: '',
    quality: 'high',
    size: '1024x1024',
    format: 'url'
  });

  const [errors, setErrors] = useState({
    prompt: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (name === 'prompt' && value.trim().length > 0) {
      setErrors(prev => ({ ...prev, prompt: '' }));
    }
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { prompt: '' };

    if (!formState.prompt.trim()) {
      newErrors.prompt = 'Prompt is required';
      isValid = false;
    } else if (formState.prompt.length < 10) {
      newErrors.prompt = 'Prompt must be at least 10 characters long';
      isValid = false;
    } else if (formState.prompt.length > 1000) {
      newErrors.prompt = 'Prompt must not exceed 1000 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);  // Clear previous API error
    setImageUrl(null); // Clear previous result
    if (validateForm()) {
      setIsLoading(true);
      try {
        const response = await generateImage({
          prompt: formState.prompt,
          size: formState.size,
          quality: formState.quality
        });
        console.log('Image generated:', response);
        // Construct image URL from filename: /api/images/file/{filename}
        setImageUrl(`/api/images/file/${response.filename}`);
      } catch (error: any) {
        console.error('Failed to generate image:', error);
        // Use the standardized error message from the interceptor
        setApiError(error.message || 'An unknown error occurred generating the image.'); 
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">Generate New Image</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
            Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            id="prompt"
            name="prompt"
            value={formState.prompt}
            onChange={handleChange}
            placeholder="Enter your image description here (e.g., 'A futuristic cityscape at sunset')"
            className={`w-full h-24 p-3 bg-gray-800 text-white rounded-lg border ${errors.prompt ? 'border-red-500' : 'border-gray-600'} focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none`}
            aria-required="true"
            aria-invalid={!!errors.prompt}
            aria-describedby={errors.prompt ? 'prompt-error' : undefined}
            disabled={isLoading}
          ></textarea>
          {errors.prompt && (
            <p id="prompt-error" className="mt-1 text-sm text-red-500">{errors.prompt}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">{formState.prompt.length}/1000 characters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="quality" className="block text-sm font-medium text-gray-300 mb-2">
              Quality
            </label>
            <select
              id="quality"
              name="quality"
              value={formState.quality}
              onChange={handleChange}
              className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={isLoading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-300 mb-2">
              Size
            </label>
            <select
              id="size"
              name="size"
              value={formState.size}
              onChange={handleChange}
              className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={isLoading}
            >
              <option value="256x256">256x256</option>
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Format
          </label>
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <input
                type="radio"
                id="url"
                name="format"
                value="url"
                checked={formState.format === 'url'}
                onChange={handleRadioChange}
                className="text-blue-500 focus:ring-blue-500"
                disabled={isLoading}
              />
              <label htmlFor="url" className="ml-2 text-sm text-gray-300">
                URL
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="b64_json"
                name="format"
                value="b64_json"
                checked={formState.format === 'b64_json'}
                onChange={handleRadioChange}
                className="text-blue-500 focus:ring-blue-500"
                disabled={isLoading}
              />
              <label htmlFor="b64_json" className="ml-2 text-sm text-gray-300">
                Base64 JSON
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Image'}
          </Button>
        </div>

        {isLoading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
            <p className="mt-2 text-sm text-gray-300">Processing your request, this may take a moment...</p>
          </div>
        )}
      </form>

      {/* API Error Display - Use ErrorMessage component */}
      <ErrorMessage message={apiError} title="Generation Failed" />

      {/* Generated Image Display */}
      {imageUrl && !isLoading && (
        <div className="mt-8 border-t border-gray-700 pt-8">
          <h3 className="text-xl font-semibold mb-4 text-white">Generated Image:</h3>
          <img 
            src={imageUrl} 
            alt="Generated by AI" 
            className="w-full rounded-lg shadow-lg border border-gray-700"
          />
          {/* Add download/save buttons later if needed for generation */}
        </div>
      )}
    </div>
  );
}

export default ImageGenerationForm; 