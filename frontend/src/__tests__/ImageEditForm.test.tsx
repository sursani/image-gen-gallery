import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ImageEditForm from '../components/ImageEditForm';

// Helper to create a file-like object
const mockFile = new File(['abc'], 'file.png', { type: 'image/png' });

describe('ImageEditForm', () => {
  const baseProps = {
    uploadedFile: mockFile,
    previewUrl: 'preview.png',
    onSubmit: vi.fn(),
    isLoading: false,
  } as const;

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('returns null when no file is provided', () => {
    const { container } = render(
      <ImageEditForm
        uploadedFile={null}
        previewUrl={null}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('validates prompt length and shows error', () => {
    render(<ImageEditForm {...baseProps} />);

    const textarea = screen.getByPlaceholderText(/add a hat/i);
    // Input a very short prompt (<5 chars) which should be invalid
    fireEvent.change(textarea, { target: { value: 'hey' } });
    fireEvent.submit(textarea.closest('form')!);

    expect(screen.getByText(/at least 5 characters/i)).toBeInTheDocument();
    expect(baseProps.onSubmit).not.toHaveBeenCalled();

    // Very long prompt triggers max-length validation (over 500 chars)
    const textareaLong = screen.getByPlaceholderText(/add a hat/i);
    fireEvent.change(textareaLong, { target: { value: 'x'.repeat(600) } });
    fireEvent.submit(textareaLong.closest('form')!);
    expect(screen.getByText(/must not exceed 500 characters/i)).toBeInTheDocument();
  });

  it('submits valid prompt and shows character counter', () => {
    render(<ImageEditForm {...baseProps} />);
    const textarea = screen.getByPlaceholderText(/add a hat/i);

    fireEvent.change(textarea, { target: { value: 'Make the sky pink' } });
    fireEvent.submit(textarea.closest('form')!);

    expect(baseProps.onSubmit).toHaveBeenCalledWith('Make the sky pink');
    // Character counter updates synchronously
    expect(screen.getByText(/\/500 characters/i)).toBeInTheDocument();
  });

  it('clears prompt when previewUrl changes', () => {
    const { rerender } = render(<ImageEditForm {...baseProps} />);
    const textarea = screen.getByPlaceholderText(/add a hat/i);
    fireEvent.change(textarea, { target: { value: 'some prompt' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('some prompt');

    // Rerender with a different previewUrl which should reset the input
    rerender(<ImageEditForm {...baseProps} previewUrl="preview-2.png" />);
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });
});