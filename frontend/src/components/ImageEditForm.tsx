import React, { useState, useEffect } from 'react';
import Button from './Button';

interface ImageEditFormProps {
  uploadedFile: File | null;
  previewUrl: string | null;
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

function ImageEditForm({ uploadedFile, previewUrl, onSubmit, isLoading }: ImageEditFormProps) {
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);

  useEffect(() => {
    setPrompt('');
    setPromptError(null);
  }, [previewUrl]); // Clears prompt when the previewUrl (and thus image) changes

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (e.target.value.trim().length > 0) {
      setPromptError(null);
    }
  };

  const validatePrompt = (): boolean => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setPromptError('Edit prompt is required.');
      return false;
    } else if (trimmedPrompt.length < 5) {
      setPromptError('Prompt must be at least 5 characters long.');
      return false;
    } else if (trimmedPrompt.length > 500) {
      setPromptError('Prompt must not exceed 500 characters.');
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
    return null;
  }

  // Base input styling from ImageGenerationForm.tsx for consistency
  const inputBaseClasses = "w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors duration-150 ease-in-out";
  const lightInputClasses = "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500";
  const darkInputClasses = "dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-purple-400 dark:focus:ring-purple-400";
  const inputErrorClasses = "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400";
  const inputNormalClasses = `${lightInputClasses} ${darkInputClasses}`;

  return (
    // Removed mt-6, as parent component (EditImageView) now uses space-y for children spacing
    <div className="w-full">
      {/* The h3 for "Edit Image" might be redundant if the parent section already has a title like "2. Describe Your Edit" */}
      {/* <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">Describe the Edit</h3> */}

      <div className="flex flex-col lg:flex-row gap-x-8 gap-y-6 items-start">
        <div className="w-full lg:w-2/5 flex-shrink-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original Image:</p>
          <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md">
            <img
              src={previewUrl}
              alt="Uploaded preview for editing"
              className="w-full h-full object-contain border border-gray-200 dark:border-gray-600"
            />
          </div>
        </div>

        <div className="w-full lg:w-3/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="editPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Edit Prompt <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <textarea
                id="editPrompt"
                name="editPrompt"
                rows={5} // Increased rows for better UX
                value={prompt}
                onChange={handlePromptChange}
                placeholder="e.g., Add a hat to the person, change background to a beach..."
                className={`${inputBaseClasses} ${promptError ? inputErrorClasses : inputNormalClasses} resize-none`}
                aria-required="true"
                aria-invalid={!!promptError}
                aria-describedby={promptError ? 'prompt-error-edit' : undefined}
                disabled={isLoading}
              />
              {promptError && (
                <p id="prompt-error-edit" className="mt-1 text-sm text-red-600 dark:text-red-400">{promptError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{prompt.length}/500 characters</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Applying Edit...' : 'Apply Edit'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ImageEditForm;
