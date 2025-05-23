import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRef } from 'react';

// Define mockFetch here, it will be in scope for the factory
const mockFetch = vi.fn();

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    // Conditionally use the mock or the actual implementation if needed elsewhere
    fetchImageMetadata: (...args: any[]) => mockFetch(...args),
  };
});

// Now import the component that uses the mocked module
import GalleryView, { GalleryViewRef } from '../components/GalleryView';

const sampleImage = (id: string) => ({
  id,
  prompt: `prompt-${id}`,
  parameters: null,
  filename: `${id}.png`,
  timestamp: new Date().toISOString(),
});

// Test component that uses the ref
const TestWrapper = () => {
  const galleryRef = useRef<GalleryViewRef>(null);
  
  return (
    <div>
      <button onClick={() => galleryRef.current?.refresh()}>Refresh Gallery</button>
      <GalleryView ref={galleryRef} />
    </div>
  );
};

describe('GalleryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('refreshes gallery when refresh method is called via ref', async () => {
    // Mock successful responses
    mockFetch.mockResolvedValue([sampleImage('1'), sampleImage('2')]);

    render(<TestWrapper />);

    // Wait for initial load
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(await screen.findAllByRole('img')).toHaveLength(2);

    // Click refresh button
    fireEvent.click(screen.getByRole('button', { name: /refresh gallery/i }));

    // Should trigger another API call
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});