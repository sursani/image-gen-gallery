import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the client module BEFORE importing the component under test
const mockFetch = vi.fn();
vi.mock('../api/client', async () => {
  const actual = await vi.importActual<any>('../api/client');
  return {
    ...actual,
    fetchImageMetadata: mockFetch,
  };
});

import GalleryView from '../components/GalleryView';

const sampleImage = (id: string) => ({
  id,
  prompt: `prompt-${id}`,
  parameters: null,
  filename: `${id}.png`,
  timestamp: new Date().toISOString(),
});

describe('GalleryView', () => {
  it('loads and displays images and supports pagination', async () => {
    // First page returns ITEMS_PER_PAGE (12) items, second page empty to stop
    mockFetch.mockResolvedValueOnce(Array.from({ length: 12 }, (_, i) => sampleImage(String(i))))
             .mockResolvedValueOnce([]);

    render(<GalleryView />);

    // Wait for first batch
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(await screen.findAllByRole('img')).toHaveLength(12);

    // Click load more, should request next page
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    render(<GalleryView />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });
});