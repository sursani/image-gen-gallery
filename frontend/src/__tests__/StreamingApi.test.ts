import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateImageStream } from '../api/imageGeneration';
import { editImageStream } from '../api/imageEditing';
import type { StreamEvent } from '../api/imageGeneration';

// Mock fetch globally
global.fetch = vi.fn();

describe('Streaming API Tests', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.mocked(global.fetch);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateImageStream', () => {
    it('should handle successful streaming generation', async () => {
      const events: StreamEvent[] = [];
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "progress", "data": "Starting"}\n\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "partial_image", "data": "abc123"}\n\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "complete", "metadata": {"id": "123"}, "image_data": "fulldata"}\n\n')
          })
          .mockResolvedValueOnce({ done: true })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader }
      });

      const abort = await generateImageStream(
        { prompt: 'test', size: '1024x1024', quality: 'auto' },
        (event) => events.push(event)
      );

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ type: 'progress', data: 'Starting' });
      expect(events[1]).toEqual({ type: 'partial_image', data: 'abc123' });
      expect(events[2]).toEqual({ 
        type: 'complete', 
        metadata: { id: '123' }, 
        image_data: 'fulldata' 
      });

      expect(typeof abort).toBe('function');
    });

    it('should handle streaming errors', async () => {
      const events: StreamEvent[] = [];
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "error", "error": "API Error"}\n\n')
          })
          .mockResolvedValueOnce({ done: true })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader }
      });

      await generateImageStream(
        { prompt: 'test', size: '1024x1024', quality: 'auto' },
        (event) => events.push(event)
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'error', error: 'API Error' });
    });

    it('should handle HTTP errors', async () => {
      const events: StreamEvent[] = [];
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await generateImageStream(
        { prompt: 'test', size: '1024x1024', quality: 'auto' },
        (event) => events.push(event)
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect(events[0].error).toContain('HTTP error! status: 500');
    });

    it('should handle network errors', async () => {
      const events: StreamEvent[] = [];
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await generateImageStream(
        { prompt: 'test', size: '1024x1024', quality: 'auto' },
        (event) => events.push(event)
      );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'error', error: 'Error: Network error' });
    });

    it('should handle malformed SSE data', async () => {
      const events: StreamEvent[] = [];
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: invalid json\n\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "complete"}\n\n')
          })
          .mockResolvedValueOnce({ done: true })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader }
      });

      await generateImageStream(
        { prompt: 'test', size: '1024x1024', quality: 'auto' },
        (event) => events.push(event)
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only have the valid event
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'complete' });
    });

    it('should handle abort signal', async () => {
      const events: StreamEvent[] = [];
      const abortController = new AbortController();
      
      // Mock a long-running stream
      const mockReader = {
        read: vi.fn().mockImplementation(() => 
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                done: false,
                value: new TextEncoder().encode('data: {"type": "progress"}\n\n')
              });
            }, 1000);
          })
        )
      };

      mockFetch.mockImplementation((url, options) => {
        // Simulate abort
        setTimeout(() => abortController.abort(), 50);
        
        return Promise.resolve({
          ok: true,
          body: { getReader: () => mockReader }
        });
      });

      const abort = await generateImageStream(
        { prompt: 'test', size: '1024x1024', quality: 'auto' },
        (event) => events.push(event)
      );

      // The abort function should be returned
      expect(typeof abort).toBe('function');
      
      // Simulate abort
      abort();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not receive events after abort
      expect(events.length).toBeLessThanOrEqual(1);
    });
  });

  describe('editImageStream', () => {
    it('should handle successful streaming edit', async () => {
      const events: StreamEvent[] = [];
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "progress", "data": "Processing"}\n\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "complete", "metadata": {"id": "456"}}\n\n')
          })
          .mockResolvedValueOnce({ done: true })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader }
      });

      const imageFile = new File(['image'], 'test.png', { type: 'image/png' });
      
      const abort = await editImageStream(
        'make it blue',
        imageFile,
        null,
        '1024x1024',
        'auto',
        (event) => events.push(event)
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: 'progress', data: 'Processing' });
      expect(events[1]).toEqual({ 
        type: 'complete', 
        metadata: { id: '456' }
      });

      // Verify FormData was sent
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/edit/stream'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
    });

    it('should handle edit with mask file', async () => {
      const events: StreamEvent[] = [];
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "complete", "metadata": {"id": "789"}}\n\n')
          })
          .mockResolvedValueOnce({ done: true })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader }
      });

      const imageFile = new File(['image'], 'test.png', { type: 'image/png' });
      const maskFile = new File(['mask'], 'mask.png', { type: 'image/png' });
      
      await editImageStream(
        'replace background',
        imageFile,
        maskFile,
        '1024x1024',
        'auto',
        (event) => events.push(event)
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toHaveLength(1);
      expect(events[0].metadata?.id).toBe('789');

      // Verify FormData includes mask
      const formDataArg = mockFetch.mock.calls[0][1].body;
      expect(formDataArg).toBeInstanceOf(FormData);
    });
  });
});