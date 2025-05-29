import React, { useState } from 'react';
import { generateImageStream } from '../api/imageGeneration';

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
    if (!validateForm()) return;

    setIsLoading(true);
    let b64 = '';
    try {
      await generateImageStream(
        {
          prompt: formState.prompt,
          size: formState.size,
          quality: formState.quality,
        },
        (msg) => {
          if (msg.type === 'partial') {
            setImageUrl(`data:image/png;base64,${b64}${msg.data}`);
            b64 += msg.data;
          } else if (msg.type === 'complete' && msg.metadata) {
            setImageUrl(`/api/images/file/${msg.metadata.filename}`);
          }
        }
      );
    } catch (error: any) {
      setApiError(error.message || 'An unknown error occurred generating the image.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-20">
      <div className="max-w-3xl mx-auto">
        {/* Header Section with lots of space */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-dark-text-primary mb-4 tracking-tight">
            Generate New Image
          </h1>
          <p className="text-lg text-dark-text-muted">
            Create amazing images with AI
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Prompt Section - Full Width */}
          <div className="space-y-4">
            <label htmlFor="prompt" className="block text-base font-medium text-dark-text-primary">
              Describe your image
            </label>
            <div className="relative">
              <textarea
                id="prompt"
                name="prompt"
                value={formState.prompt}
                onChange={handleChange}
                placeholder="A serene mountain landscape at sunset with golden light..."
                rows={6}
                aria-required="true"
                aria-invalid={!!errors.prompt}
                aria-describedby={errors.prompt ? 'prompt-error' : undefined}
                disabled={isLoading}
                className={`
                  w-full px-6 py-4 
                  bg-dark-surface/50 backdrop-blur 
                  text-dark-text-primary text-base
                  border-2 border-dark-border/50 
                  rounded-2xl 
                  placeholder:text-dark-text-muted/60
                  focus:outline-none focus:border-dark-accent/50 focus:bg-dark-surface/70
                  transition-all duration-300 resize-none
                  ${errors.prompt ? 'border-red-500/50' : ''}
                `}
                style={{ minHeight: '160px' }}
              />
              {errors.prompt && (
                <p id="prompt-error" className="absolute -bottom-6 left-0 text-sm text-red-500">
                  {errors.prompt}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center text-sm text-dark-text-muted">
              <span>Be descriptive for best results</span>
              <span>{formState.prompt.length}/1000</span>
            </div>
          </div>

          {/* Options Section with Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quality Card */}
            <div className="space-y-3">
              <label htmlFor="quality" className="block text-base font-medium text-dark-text-primary">
                Image Quality
              </label>
              <div className="relative">
                <select
                  id="quality"
                  name="quality"
                  value={formState.quality}
                  onChange={handleChange}
                  className="
                    w-full px-6 py-4 
                    bg-dark-surface/50 backdrop-blur
                    text-dark-text-primary text-base
                    border-2 border-dark-border/50 
                    rounded-2xl 
                    appearance-none cursor-pointer
                    focus:outline-none focus:border-dark-accent/50 focus:bg-dark-surface/70
                    transition-all duration-300
                    hover:bg-dark-surface/70
                  "
                  disabled={isLoading}
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                  <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Size Card */}
            <div className="space-y-3">
              <label htmlFor="size" className="block text-base font-medium text-dark-text-primary">
                Image Dimensions
              </label>
              <div className="relative">
                <select
                  id="size"
                  name="size"
                  value={formState.size}
                  onChange={handleChange}
                  className="
                    w-full px-6 py-4 
                    bg-dark-surface/50 backdrop-blur
                    text-dark-text-primary text-base
                    border-2 border-dark-border/50 
                    rounded-2xl 
                    appearance-none cursor-pointer
                    focus:outline-none focus:border-dark-accent/50 focus:bg-dark-surface/70
                    transition-all duration-300
                    hover:bg-dark-surface/70
                  "
                  disabled={isLoading}
                >
                  <option value="1024x1024">Square (1024×1024)</option>
                  <option value="1536x1024">Landscape (1536×1024)</option>
                  <option value="1024x1536">Portrait (1024×1536)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                  <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-4">
            <label className="block text-base font-medium text-dark-text-primary">
              Output Format
            </label>
            <div className="flex gap-8">
              <label className="
                flex items-center gap-3 cursor-pointer 
                px-6 py-4 rounded-2xl 
                border-2 border-dark-border/50
                hover:bg-dark-surface/50 
                transition-all duration-300
                has-[:checked]:border-dark-accent/50 has-[:checked]:bg-dark-surface/70
              ">
                <input
                  type="radio"
                  id="url"
                  name="format"
                  value="url"
                  checked={formState.format === 'url'}
                  onChange={handleChange}
                  className="w-5 h-5 text-dark-accent bg-transparent border-2 border-dark-text-muted focus:ring-0 focus:ring-offset-0"
                  disabled={isLoading}
                />
                <span className="text-base text-dark-text-primary">
                  Image URL
                </span>
              </label>
              <label className="
                flex items-center gap-3 cursor-pointer 
                px-6 py-4 rounded-2xl 
                border-2 border-dark-border/50
                hover:bg-dark-surface/50 
                transition-all duration-300
                has-[:checked]:border-dark-accent/50 has-[:checked]:bg-dark-surface/70
              ">
                <input
                  type="radio"
                  id="b64_json"
                  name="format"
                  value="b64_json"
                  checked={formState.format === 'b64_json'}
                  onChange={handleChange}
                  className="w-5 h-5 text-dark-accent bg-transparent border-2 border-dark-text-muted focus:ring-0 focus:ring-offset-0"
                  disabled={isLoading}
                />
                <span className="text-base text-dark-text-primary">
                  Base64 JSON
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button - Prominent */}
          <div className="pt-8">
            <button 
              type="submit" 
              className={`
                w-full py-5 px-8
                bg-dark-accent text-white 
                text-lg font-semibold
                rounded-2xl
                transition-all duration-300
                hover:bg-dark-accent/90 hover:scale-[1.02]
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                flex items-center justify-center gap-3
              `}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                'Generate Image'
              )}
            </button>
          </div>
        </form>

        {/* Status Messages */}
        {isLoading && (
          <div className="mt-12 text-center">
            <p className="text-base text-dark-text-muted animate-pulse">
              Creating your masterpiece...
            </p>
          </div>
        )}

        {/* Error Message */}
        {apiError && (
          <div className="mt-12 p-6 bg-red-500/10 border-2 border-red-500/30 rounded-2xl">
            <h3 className="text-lg font-semibold text-red-500 mb-2">Generation Failed</h3>
            <p className="text-dark-text-secondary">{apiError}</p>
          </div>
        )}

        {/* Generated Image Display */}
        {imageUrl && !isLoading && (
          <div className="mt-20 space-y-8">
            <h2 className="text-3xl font-bold text-dark-text-primary text-center">
              Your Generated Image
            </h2>
            <div className="relative overflow-hidden rounded-3xl bg-dark-surface/50 backdrop-blur p-2">
              <img
                src={imageUrl}
                alt="AI Generated"
                className="w-full h-auto rounded-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageGenerationForm;
