import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchImageMetadata, getImageUrl } from '../api/client';

// ----- fetchImageMetadata -----

global.fetch = vi.fn();

function mockFetch(data: any, ok = true) {
  (global.fetch as any).mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
  });
}

describe('client API helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchImageMetadata returns parsed JSON on success', async () => {
    const items = [{ id: '1', prompt: 'hi', parameters: null, filename: '1.png', timestamp: '2024-01-01' }];
    mockFetch(items);
    const res = await fetchImageMetadata();
    expect(res).toEqual(items);
  });

  it('fetchImageMetadata throws on HTTP error', async () => {
    mockFetch({ detail: 'bad' }, false);
    await expect(fetchImageMetadata()).rejects.toThrow('bad');
  });

  it('getImageUrl builds url', () => {
    expect(getImageUrl('abc')).toMatch(/abc$/);
  });
});