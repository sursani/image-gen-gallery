import React, { useState } from 'react';
import Button from './Button';
import { generateImage } from '../api/imageGeneration';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import Card from './Card';
import TextArea from './TextArea';

function ImageGenerationForm() {
  const [formState, setFormState] = useState({
    prompt: '',
    quality: 'auto',
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
          quality: formState.quality,
        });
        setImageUrl(`/api/images/file/${response.filename}`);
      } catch (error: any) {
        setApiError(error.message || 'An unknown error occurred generating the image.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // New styles for form elements
  const selectBaseClasses = "w-full bg-dark-input text-dark-text-primary border border-dark-border rounded-ui-pill px-4 py-2 focus:outline-none focus:border-dark-accent transition-all duration-200";
  const radioClasses = "h-4 w-4 text-dark-accent focus:ring-dark-accent border-dark-border bg-dark-input";

  // Direct styling for container
  const containerStyle = {
    maxWidth: '768px',
    margin: '0 auto',
    padding: '48px 32px'
  };
  
  const headingStyle = {
    fontSize: '1.875rem',
    fontWeight: 600,
    marginBottom: '48px',
    textAlign: 'center' as 'center',
    color: '#FFFFFF'
  };
  
  const formStyle = {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '24px'
  };

  return (
    <div style={containerStyle} className="max-w-3xl mx-auto py-12 px-8">
      <Card padding="p-8 pb-12" className="mb-12">
        <h2 style={headingStyle} className="text-3xl font-semibold mb-12 text-center text-white">Generate New Image</h2>
        <form style={formStyle} onSubmit={handleSubmit}>
          <div className="w-full">
            <TextArea
              label="Prompt"
              id="prompt"
              name="prompt"
              value={formState.prompt}
              onChange={handleChange}
              placeholder="e.g., A photo of a white fur monster standing in a purple room."
              rows={5}
              error={errors.prompt}
              aria-required="true"
              aria-invalid={!!errors.prompt}
              aria-describedby={errors.prompt ? 'prompt-error' : undefined}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-dark-text-muted text-right">{formState.prompt.length}/1000 characters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-md gap-y-lg">
            <div>
              <label htmlFor="quality" className="block text-sm font-medium text-dark-text-secondary mb-2">
                Quality
              </label>
              <select
                id="quality"
                name="quality"
                value={formState.quality}
                onChange={handleChange}
                className={`${selectBaseClasses} appearance-none rounded-lg`}
                disabled={isLoading}
              >
                <option value="auto">Auto</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium text-dark-text-secondary mb-2">
                Image Size
              </label>
              <select
                id="size"
                name="size"
                value={formState.size}
                onChange={handleChange}
                className={`${selectBaseClasses} appearance-none rounded-lg`}
                disabled={isLoading}
              >
                <option value="1024x1024">1024x1024 (Square)</option>
                <option value="1536x1024">1536x1024 (Landscape)</option>
                <option value="1024x1536">1024x1536 (Portrait)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-3">
              Response Format
            </label>
            <div className="flex items-center space-x-lg mt-sm">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="url"
                  name="format"
                  value="url"
                  checked={formState.format === 'url'}
                  onChange={handleChange}
                  className={radioClasses}
                  disabled={isLoading}
                />
                <label htmlFor="url" className="ml-2 text-sm text-dark-text-secondary">
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
                  className={radioClasses}
                  disabled={isLoading}
                />
                <label htmlFor="b64_json" className="ml-2 text-sm text-dark-text-secondary">
                  Base64 JSON
                </label>
              </div>
            </div>
          </div>

          <div className="pt-lg pb-lg mb-6">
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full sm:w-auto px-lg" 
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Image'}
            </Button>
          </div>

          {isLoading && (
            <div className="mt-md text-center">
              <LoadingSpinner size="md" />
              <p className="mt-sm text-sm text-dark-text-muted">Creating your image, please wait a moment...</p>
            </div>
          )}
        </form>

        {apiError && (
          <div className="mt-lg">
            <ErrorMessage message={apiError} title="Image Generation Failed" />
          </div>
        )}

        {imageUrl && !isLoading && (
          <div className="mt-xl border-t border-dark-border pt-lg">
            <h3 className="text-xl font-semibold mb-md text-dark-text-primary">Your Generated Image:</h3>
            <div className="bg-dark-elevated p-sm rounded-ui-md border border-dark-border">
              <img
                src={imageUrl}
                alt="Generated by AI"
                className="w-full h-auto object-contain rounded-ui-sm"
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ImageGenerationForm;
