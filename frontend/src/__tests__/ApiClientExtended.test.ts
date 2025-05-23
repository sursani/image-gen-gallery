import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchImageMetadata, getImageUrl } from '../api/client';

// Extended tests for API client edge cases and better coverage

global.fetch = vi.fn();

function mockFetch(data: any, ok = true, status = 200) {
  (global.fetch as any).mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
  });
}

function mockFetchError() {
  (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
}

describe('API Client Extended Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchImageMetadata edge cases', () => {
    it('handles different pagination parameters', async () => {
      const items = [{ id: '1', prompt: 'test', parameters: {}, filename: 'test.png', timestamp: '2024-01-01' }];
      mockFetch(items);
      
      const result = await fetchImageMetadata({ limit: 5, offset: 10, sort: 'oldest' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5&offset=10&sort=oldest')
      );
      expect(result).toEqual(items);
    });

    it('uses default parameters when none provided', async () => {
      const items = [];
      mockFetch(items);
      
      await fetchImageMetadata();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=12&offset=0&sort=newest')
      );
    });

    it('handles API error with non-JSON response body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(fetchImageMetadata()).rejects.toThrow('API request failed with status 500');
    });

    it('handles network errors', async () => {
      mockFetchError();
      
      await expect(fetchImageMetadata()).rejects.toThrow('Network error');
    });

    it('handles server error with detailed message', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Invalid parameters provided' }),
      });

      await expect(fetchImageMetadata()).rejects.toThrow('Invalid parameters provided');
    });

    it('handles empty response', async () => {
      mockFetch([]);
      
      const result = await fetchImageMetadata();
      expect(result).toEqual([]);
    });

    it('constructs correct URL with environment variable', () => {
      // Test with mock environment
      const originalEnv = import.meta.env.VITE_API_BASE_URL;
      
      // Mock the environment variable
      Object.defineProperty(import.meta, 'env', {
        value: { VITE_API_BASE_URL: 'https://api.example.com' },
        writable: true
      });
      
      const url = getImageUrl('test-123');
      expect(url).toBe('https://api.example.com/api/images/test-123');
      
      // Restore original
      Object.defineProperty(import.meta, 'env', {
        value: { VITE_API_BASE_URL: originalEnv },
        writable: true
      });
    });

    it('handles special characters in image ID', () => {
      const specialId = 'image-123_test.png';
      const url = getImageUrl(specialId);
      expect(url).toContain(`/api/images/${specialId}`);
    });
  });
});