import React, { useState } from 'react';
import Button from './Button';
import { generateImage } from '../api/imageGeneration';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';

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
    
    if (name === 'prompt' && value.trim().length > 0) {
      setErrors(prev => ({ ...prev, prompt: '' }));
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { prompt: '' };

    if (!formState.prompt.trim()) {
      newErrors.prompt = 'Prompt is required.';
      isValid = false;
    } else if (formState.prompt.length < 10) {
      newErrors.prompt = 'Prompt must be at least 10 characters long.';
      isValid = false;
    } else if (formState.prompt.length > 1000) {
      newErrors.prompt = 'Prompt must not exceed 1000 characters for DALL-E 2 (or 4000 for DALL-E 3).';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setImageUrl(null);
    if (validateForm()) {
      setIsLoading(true);
      try {
        const response = await generateImage({
          prompt: formState.prompt,
          size: formState.size,
          quality: formState.quality === 'high' ? 'hd' : 'standard',
        });
        setImageUrl(`/api/images/file/${response.filename}`);
      } catch (error: any) {
        setApiError(error.message || 'An unknown error occurred generating the image.'); 
      } finally {
        setIsLoading(false);
      }
    }
  };

  const inputBaseClasses = "w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors duration-150 ease-in-out";
  const lightInputClasses = "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500";
  const darkInputClasses = "dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-purple-400 dark:focus:ring-purple-400";
  
  const inputErrorClasses = "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400";
  const inputNormalClasses = `${lightInputClasses} ${darkInputClasses}`;

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <h2 className="text-3xl font-semibold mb-6 text-center">Generate New Image</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prompt <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <textarea
            id="prompt"
            name="prompt"
            value={formState.prompt}
            onChange={handleChange}
            placeholder="e.g., A photo of a white fur monster standing in a purple room."
            className={`${inputBaseClasses} ${errors.prompt ? inputErrorClasses : inputNormalClasses} h-28 resize-none`}
            aria-required="true"
            aria-invalid={!!errors.prompt}
            aria-describedby={errors.prompt ? 'prompt-error' : undefined}
            disabled={isLoading}
          />
          {errors.prompt && (
            <p id="prompt-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.prompt}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formState.prompt.length}/1000 characters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          <div>
            <label htmlFor="quality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quality
            </label>
            <select
              id="quality"
              name="quality"
              value={formState.quality}
              onChange={handleChange}
              className={`${inputBaseClasses} ${inputNormalClasses}`}
              disabled={isLoading}
            >
              <option value="standard">Standard</option>
              <option value="high">HD (High)</option>
            </select>
          </div>

          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Size (DALL-E 3: 1024x1024, 1792x1024, 1024x1792. DALL-E 2: 256x256, 512x512, 1024x1024)
            </label>
            <select
              id="size"
              name="size"
              value={formState.size}
              onChange={handleChange}
              className={`${inputBaseClasses} ${inputNormalClasses}`}
              disabled={isLoading}
            >
              <option value="1024x1024">1024x1024 (Square)</option>
              <option value="1792x1024">1792x1024 (Landscape)</option>
              <option value="1024x1792">1024x1792 (Portrait)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Response Format
          </label>
          <div className="flex items-center space-x-6 mt-1">
            <div className="flex items-center">
              <input
                type="radio"
                id="url"
                name="format"
                value="url"
                checked={formState.format === 'url'}
                onChange={handleChange}
                className="h-4 w-4 text-purple-600 dark:text-purple-400 focus:ring-purple-500 dark:focus:ring-purple-400 border-gray-300 dark:border-gray-600"
                disabled={isLoading}
              />
              <label htmlFor="url" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Image URL
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="b64_json"
                name="format"
                value="b64_json"
                checked={formState.format === 'b64_json'}
                onChange={handleChange}
                className="h-4 w-4 text-purple-600 dark:text-purple-400 focus:ring-purple-500 dark:focus:ring-purple-400 border-gray-300 dark:border-gray-600"
                disabled={isLoading}
              />
              <label htmlFor="b64_json" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Base64 JSON
              </label>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" className="w-full sm:w-auto sm:px-8" disabled={isLoading}>
            {isLoading ? 'Generating Your Masterpiece...' : 'Generate Image'}
          </Button>
        </div>

        {isLoading && (
          <div className="mt-6 text-center">
            <LoadingSpinner />
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Creating your image, please wait a moment...</p>
          </div>
        )}
      </form>

      {apiError && (
          <div className="mt-8">
            <ErrorMessage message={apiError} title="Image Generation Failed" />
          </div>
      )}

      {imageUrl && !isLoading && (
        <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">Your Generated Image:</h3>
          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <img 
              src={imageUrl} 
              alt="Generated by AI" 
              className="w-full h-auto object-contain rounded-md shadow-inner"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageGenerationForm; 