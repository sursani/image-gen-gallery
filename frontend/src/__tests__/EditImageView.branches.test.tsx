import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';

const uploaderCallbacks: Array<(file: File, preview: string) => void> = [];

// Reuse simple uploader mock
vi.mock('../components/ImageUploader', () => ({
  __esModule: true,
  default: ({ onImageUpload }: any) => {
    React.useEffect(() => {
      uploaderCallbacks.push(onImageUpload);
    }, [onImageUpload]);
    return <button data-testid="uploader" />;
  },
}));

// Mock ImageEditForm for download/save section not needed here
vi.mock('../components/ImageEditForm', () => ({
  __esModule: true,
  default: () => null,
}));

const editMock = vi.fn();
vi.mock('../api/imageEditing', () => ({
  editImage: (...args: any[]) => editMock(...args),
}));

import EditImageView from '../views/EditImageView';

// Helper to create dynamic dimension Image stub
class DimImage {
  naturalWidth: number;
  naturalHeight: number;
  onload: (() => void) | null = null;
  constructor(private w = 100, private h = 100) {
    this.naturalWidth = w;
    this.naturalHeight = h;
  }
  set src(_val: string) {
    setTimeout(() => this.onload && this.onload());
  }
}

const createFile = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('EditImageView additional branches', () => {
  beforeEach(() => {
    uploaderCallbacks.length = 0;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('shows dimension mismatch error for mask image', async () => {
    // Stub global Image for original (100x100) then for mask (200x200)
    let call = 0;
    // @ts-ignore
    global.Image = class extends DimImage {
      constructor() {
        super(call === 0 ? 100 : 200, call === 0 ? 100 : 200);
        call += 1;
      }
    } as any;

    render(<EditImageView />);

    await act(async () => {
      await uploaderCallbacks[0](createFile('orig.png'), 'orig');
    });

    await act(async () => {
      await uploaderCallbacks[1](createFile('mask.png'), 'mask');
    });

    await waitFor(() => {
      expect(screen.getByText(/mask dimensions/i)).toBeInTheDocument();
    });
  });

  it('triggers download button click', async () => {
    // Use equal dims so no error
    // @ts-ignore
    global.Image = DimImage as any;

    editMock.mockResolvedValueOnce({ image_url: 'result.png' });
    // Spy on createElement and click
    const clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: any) => {
      const el = origCreate(tag);
      if (tag === 'a') {
        // @ts-ignore
        el.click = clickSpy;
      }
      return el;
    });

    render(<EditImageView />);

    await act(async () => {
      await uploaderCallbacks[0](createFile('orig.png'), 'orig');
    });

    // simulate successful edit to set result url
    await waitFor(() => expect(editMock).toHaveBeenCalled());

    // Click download
    fireEvent.click(await screen.findByRole('button', { name: /download image/i }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('invokes save to gallery alert', async () => {
    // @ts-ignore
    global.Image = DimImage as any;
    editMock.mockResolvedValueOnce({ image_url: 'result.png' });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<EditImageView />);
    await act(async () => uploaderCallbacks[0](createFile('orig.png'), 'orig'));
    await waitFor(() => expect(editMock).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: /save to gallery/i }));
    expect(alertSpy).toHaveBeenCalled();
  });
});