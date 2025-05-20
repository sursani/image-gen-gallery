import React, { useState, useEffect } from 'react';
import Button from './Button';
import TextArea from './TextArea';

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

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-x-lg gap-y-md items-start">
        <div className="w-full lg:w-2/5 flex-shrink-0">
          <p className="text-sm font-medium text-dark-text-secondary mb-2">Original Image:</p>
          <div className="aspect-square bg-dark-surface rounded-ui-md overflow-hidden border border-dark-border">
            <img
              src={previewUrl}
              alt="Uploaded preview for editing"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="w-full lg:w-3/5">
          <form onSubmit={handleSubmit} className="space-y-lg">
            <TextArea
              label="Edit Prompt"
              id="editPrompt"
              name="editPrompt"
              rows={5}
              value={prompt}
              onChange={handlePromptChange}
              placeholder="e.g., Add a hat to the person, change background to a beach..."
              error={promptError}
              aria-required="true"
              aria-invalid={!!promptError}
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-dark-text-muted text-right">{prompt.length}/500 characters</p>

            <div className="flex justify-end pt-sm">
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
