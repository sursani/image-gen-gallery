import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchImageMetadata, getImageUrl } from '../api/client';
import { editImage } from '../api/imageEditing';
import { generateImage } from '../api/imageGeneration';

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

// ----- axios based helpers -----

vi.mock('../api/axiosSetup', () => {
  return {
    default: {
      post: vi.fn().mockResolvedValue({ data: { id: '1' } }),
    },
  };
});

describe('axios based endpoints', () => {
  it('editImage posts multipart form and returns data', async () => {
    const file = new File(['data'], 'file.png', { type: 'image/png' });
    const result = await editImage('p', file, null);
    expect(result).toEqual({ id: '1' });
  });

  it('generateImage posts json payload', async () => {
    const payload = { prompt: 'a', size: '1', quality: '1' };
    const result = await generateImage(payload as any);
    expect(result).toEqual({ id: '1' });
  });

  it('editImage throws on api error', async () => {
    const axios = (await import('../api/axiosSetup')).default as any;
    (axios.post as any).mockRejectedValueOnce(new Error('fail'));
    const file = new File(['d'], 'f.png', { type: 'image/png' });
    await expect(editImage('x', file, null)).rejects.toThrow();
  });

  it('generateImage throws on api error', async () => {
    const axios = (await import('../api/axiosSetup')).default as any;
    (axios.post as any).mockRejectedValueOnce(new Error('bad'));
    const payload = { prompt: 'b', size: '1', quality: '1' };
    await expect(generateImage(payload as any)).rejects.toThrow();
  });
});