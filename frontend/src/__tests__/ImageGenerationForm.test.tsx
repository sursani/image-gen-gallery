import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ImageGenerationForm from '../components/ImageGenerationForm';

// Mock the streaming API util so we can control its responses
const generateMock = vi.fn();
vi.mock('../api/imageGeneration', () => ({
  generateImageStream: (...args: any[]) => generateMock(...args),
}));

describe('ImageGenerationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('validates prompt field and shows errors', async () => {
    render(<ImageGenerationForm />);

    // Submit with empty prompt -> should show required error
    fireEvent.submit(screen.getByRole('button', { name: /generate image/i }));
    expect(await screen.findByText(/prompt is required/i)).toBeInTheDocument();

    // Enter too short prompt (<10 chars)
    const textarea = screen.getByLabelText(/describe your image/i);
    fireEvent.change(textarea, { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: /generate image/i }));
    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument();

    // Very long prompt (>1000 chars) should trigger max-length validation
    fireEvent.change(textarea, { target: { value: 'x'.repeat(1100) } });
    fireEvent.submit(screen.getByRole('button', { name: /generate image/i }));
    expect(await screen.findByText(/must not exceed 1000 characters/i)).toBeInTheDocument();
  });

  it('successfully calls API and displays generated image', async () => {
    generateMock.mockImplementationOnce(async (_req, cb) => {
      cb({ type: 'complete', metadata: { filename: 'abc.png' } });
    });
    render(<ImageGenerationForm />);

    fireEvent.change(screen.getByLabelText(/describe your image/i), { target: { value: 'A wonderfully descriptive prompt exceeding 10 chars' } });
    // change some other fields to exercise handleChange branches
    fireEvent.change(screen.getByLabelText(/image dimensions/i), { target: { value: '1536x1024' } });
    fireEvent.change(screen.getByLabelText(/image quality/i), { target: { value: 'high' } });
    // switch response format radio button
    fireEvent.click(screen.getByLabelText(/base64 json/i));

    fireEvent.submit(screen.getByRole('button', { name: /generate image/i }));

    await waitFor(() => expect(generateMock).toHaveBeenCalledTimes(1));
    // Generated image should be displayed
    expect(await screen.findByAltText(/ai generated/i)).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    generateMock.mockRejectedValueOnce(new Error('boom'));
    render(<ImageGenerationForm />);

    fireEvent.change(screen.getByLabelText(/describe your image/i), { target: { value: 'A prompt long enough' } });
    fireEvent.submit(screen.getByRole('button', { name: /generate image/i }));

    await waitFor(() => expect(generateMock).toHaveBeenCalled());
    expect(await screen.findByText(/generation failed/i)).toBeInTheDocument();
  });
});