import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ImageGenerationFormStreaming from '../components/ImageGenerationFormStreaming';
import { generateImageStream } from '../api/imageGeneration';

// Mock the API module
vi.mock('../api/imageGeneration');

// Mock document.createElement for download functionality
const originalCreateElement = document.createElement.bind(document);

describe('ImageGenerationFormStreaming', () => {
  const mockGenerateImageStream = generateImageStream as any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Restore createElement mock
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a');
        link.click = vi.fn();
        return link;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('renders form with all elements', () => {
      render(<ImageGenerationFormStreaming />);
      
      expect(screen.getByText('Generate New Image')).toBeInTheDocument();
      expect(screen.getByText('Create amazing images with AI - Now with real-time progress!')).toBeInTheDocument();
      expect(screen.getByLabelText('Describe your image')).toBeInTheDocument();
      expect(screen.getByLabelText('Image Quality')).toBeInTheDocument();
      expect(screen.getByLabelText('Image Dimensions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate Image' })).toBeInTheDocument();
    });

    it('has correct default form values', () => {
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      const qualitySelect = screen.getByLabelText('Image Quality') as HTMLSelectElement;
      const sizeSelect = screen.getByLabelText('Image Dimensions') as HTMLSelectElement;
      
      expect(promptInput).toHaveValue('');
      expect(qualitySelect.value).toBe('auto');
      expect(sizeSelect.value).toBe('1024x1024');
    });
  });

  describe('Form Validation', () => {
    it('shows error when prompt is empty', async () => {
      render(<ImageGenerationFormStreaming />);
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Prompt is required.')).toBeInTheDocument();
      });
    });

    it('shows error when prompt is too short', async () => {
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'short');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Prompt must be at least 10 characters long.')).toBeInTheDocument();
      });
    });

    it('shows error when prompt is too long', async () => {
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      const longText = 'a'.repeat(1001);
      await userEvent.type(promptInput, longText);
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Prompt must not exceed 1000 characters.')).toBeInTheDocument();
      });
    });

    it('clears error when valid prompt is entered', async () => {
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      
      // First submit with empty prompt
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('Prompt is required.')).toBeInTheDocument();
      });
      
      // Then type valid prompt
      await userEvent.type(promptInput, 'A beautiful landscape painting');
      
      expect(screen.queryByText('Prompt is required.')).not.toBeInTheDocument();
    });
  });

  describe('Character Counter', () => {
    it('updates character counter as user types', async () => {
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      
      expect(screen.getByText('0/1000')).toBeInTheDocument();
      
      await userEvent.type(promptInput, 'Hello world');
      
      expect(screen.getByText('11/1000')).toBeInTheDocument();
    });
  });

  describe('Successful Image Generation', () => {
    it('handles streaming events correctly', async () => {
      const mockAbort = vi.fn();
      let streamCallback: any;
      
      mockGenerateImageStream.mockImplementation(async (params, callback) => {
        streamCallback = callback;
        return mockAbort;
      });
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockGenerateImageStream).toHaveBeenCalledWith(
          {
            prompt: 'A beautiful test landscape',
            size: '1024x1024',
            quality: 'auto',
          },
          expect.any(Function)
        );
      });
      
      // Simulate streaming events
      act(() => {
        streamCallback({ type: 'progress', data: { status: 'started' } });
      });
      
      expect(screen.getByText('Initializing generation request')).toBeInTheDocument();
      
      act(() => {
        streamCallback({ type: 'progress', data: { status: 'processing' } });
      });
      
      expect(screen.getByText('Analyzing your prompt')).toBeInTheDocument();
      
      act(() => {
        streamCallback({ type: 'progress', data: { status: 'generating' } });
      });
      
      expect(screen.getByText('Creating your image with AI')).toBeInTheDocument();
      
      // Send partial image
      act(() => {
        streamCallback({ type: 'partial_image', data: 'partial_base64_data' });
      });
      
      // Send final image
      act(() => {
        streamCallback({ type: 'image', data: 'final_base64_data' });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Your Generated Image')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
      });
    });

    it('handles legacy complete event', async () => {
      const mockAbort = vi.fn();
      let streamCallback: any;
      
      mockGenerateImageStream.mockImplementation(async (params, callback) => {
        streamCallback = callback;
        return mockAbort;
      });
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      // Send legacy complete event
      act(() => {
        streamCallback({ 
          type: 'complete', 
          metadata: { id: '123' },
          image_data: 'legacy_base64_data' 
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Your Generated Image')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message on stream error', async () => {
      const mockAbort = vi.fn();
      let streamCallback: any;
      
      mockGenerateImageStream.mockImplementation(async (params, callback) => {
        streamCallback = callback;
        return mockAbort;
      });
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      act(() => {
        streamCallback({ type: 'error', error: 'Connection failed' });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });

    it('displays error message on exception', async () => {
      mockGenerateImageStream.mockRejectedValue(new Error('Network error'));
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('handles unknown error type', async () => {
      mockGenerateImageStream.mockRejectedValue('Unknown error');
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('An unknown error occurred generating the image.')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('shows cancel button during generation and handles cancel', async () => {
      const mockAbort = vi.fn();
      mockGenerateImageStream.mockResolvedValue(mockAbort);
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);
      
      expect(mockAbort).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Controls', () => {
    it('updates quality selection', async () => {
      render(<ImageGenerationFormStreaming />);
      
      const qualitySelect = screen.getByLabelText('Image Quality') as HTMLSelectElement;
      
      fireEvent.change(qualitySelect, { target: { value: 'high' } });
      
      expect(qualitySelect.value).toBe('high');
    });

    it('updates size selection', async () => {
      render(<ImageGenerationFormStreaming />);
      
      const sizeSelect = screen.getByLabelText('Image Dimensions') as HTMLSelectElement;
      
      fireEvent.change(sizeSelect, { target: { value: '1536x1024' } });
      
      expect(sizeSelect.value).toBe('1536x1024');
    });

    it('disables form controls while loading', async () => {
      const mockAbort = vi.fn();
      mockGenerateImageStream.mockResolvedValue(mockAbort);
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(promptInput).toBeDisabled();
        expect(screen.getByLabelText('Image Quality')).toBeDisabled();
        expect(screen.getByLabelText('Image Dimensions')).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Download Functionality', () => {
    it('handles image download', async () => {
      const mockAbort = vi.fn();
      let streamCallback: any;
      
      mockGenerateImageStream.mockImplementation(async (params, callback) => {
        streamCallback = callback;
        return mockAbort;
      });
      
      // createElement mock is already set up in beforeEach
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      // Send final image
      act(() => {
        streamCallback({ type: 'image', data: 'final_base64_data' });
      });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
      });
      
      const downloadButton = screen.getByRole('button', { name: 'Download' });
      
      // Capture the created link before clicking
      let capturedLink: any;
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'a') {
          capturedLink = originalCreateElement.call(document, 'a');
          capturedLink.click = vi.fn();
          return capturedLink;
        }
        return originalCreateElement.call(document, tagName);
      });
      
      fireEvent.click(downloadButton);
      
      expect(capturedLink.href).toBe('data:image/png;base64,final_base64_data');
      expect(capturedLink.download).toMatch(/^ai-generated-\d+\.png$/);
      expect(capturedLink.click).toHaveBeenCalled();
    });
  });

  describe('Progress Display', () => {
    it('shows loading state during generation', async () => {
      const mockAbort = vi.fn();
      mockGenerateImageStream.mockResolvedValue(mockAbort);
      
      render(<ImageGenerationFormStreaming />);
      
      const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
      await userEvent.type(promptInput, 'A beautiful test landscape');
      
      const submitButton = screen.getByRole('button', { name: 'Generate Image' });
      fireEvent.click(submitButton);
      
      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });
      
      // Verify the generating button is disabled
      expect(submitButton).toBeDisabled();
      
      // Verify cancel button appears
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });
});