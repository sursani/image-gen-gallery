import React, { useState, useEffect } from 'react';
import Button from './Button';

interface ImageEditFormProps {
  uploadedFile: File | null;
  previewUrl: string | null;
  onSubmit: (prompt: string) => void; // Simplified for now
  isLoading: boolean;
}

function ImageEditForm({ uploadedFile, previewUrl, onSubmit, isLoading }: ImageEditFormProps) {
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);

  // Clear prompt when a new image is uploaded
  useEffect(() => {
    setPrompt('');
    setPromptError(null);
  }, [previewUrl]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (e.target.value.trim().length > 0) {
      setPromptError(null); // Clear error when user types
    }
  };

  const validatePrompt = (): boolean => {
    if (!prompt.trim()) {
      setPromptError('Edit prompt is required');
      return false;
    } else if (prompt.length < 5) {
      setPromptError('Prompt must be at least 5 characters long');
      return false;
    } else if (prompt.length > 500) {
      setPromptError('Prompt must not exceed 500 characters');
      return false;
    }
    setPromptError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePrompt()) {
      onSubmit(prompt);
    }
  };

  if (!uploadedFile || !previewUrl) {
    return null; // Don't render the form if no image is uploaded
  }

  return (
    <div className="w-full mt-6">
      <h3 className="text-xl font-semibold mb-4 text-white">Edit Image</h3>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Image Preview Column */}
        <div className="w-full md:w-1/3 flex-shrink-0">
          <img 
            src={previewUrl} 
            alt="Uploaded preview" 
            className="w-full rounded-lg shadow-lg border border-gray-700"
          />
        </div>

        {/* Form Column */}
        <div className="w-full md:w-2/3">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="editPrompt" className="block text-sm font-medium text-gray-300 mb-2">
                Edit Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                id="editPrompt"
                name="editPrompt"
                rows={4}
                value={prompt}
                onChange={handlePromptChange}
                placeholder="Describe the changes you want to make (e.g., 'Make the sky look like a sunset')"
                className={`w-full p-3 bg-gray-800 text-white rounded-lg border ${promptError ? 'border-red-500' : 'border-gray-600'} focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                aria-required="true"
                aria-invalid={!!promptError}
                aria-describedby={promptError ? 'prompt-error-edit' : undefined}
                disabled={isLoading}
              />
              {promptError && (
                <p id="prompt-error-edit" className="mt-1 text-sm text-red-500">{promptError}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">{prompt.length}/500 characters</p>
            </div>

            {/* Placeholder for other parameters */}
            {/* <div className="text-gray-500 text-sm">Editing parameters (e.g., strength) will be added here later.</div> */}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Editing...' : 'Apply Edit'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ImageEditForm; 