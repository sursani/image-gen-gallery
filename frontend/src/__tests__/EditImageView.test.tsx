import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// Mocks --------------------------------------------------
// Capture uploader callbacks so the test can invoke them manually
const uploaderCallbacks: Array<(file: File, preview: string) => void> = [];

vi.mock('../components/ImageUploader', () => ({
  __esModule: true,
  default: ({ onImageUpload, disabled }: any) => {
    React.useEffect(() => {
      uploaderCallbacks.push(onImageUpload);
    }, [onImageUpload]);
    return <button data-testid={disabled ? 'uploader-disabled' : 'uploader'} />;
  },
}));

const editMock = vi.fn();
vi.mock('../api/imageEditing', () => ({
  editImage: (...args: any[]) => editMock(...args),
}));

// Mock the getImageUrl function
vi.mock('../api/client', () => ({
  getImageUrl: (id: string) => `http://localhost:8000/api/images/${id}`,
}));

// Mock ImageEditForm with a simple button that triggers onSubmit
vi.mock('../components/ImageEditForm', () => ({
  __esModule: true,
  default: ({ onSubmit, isLoading }: any) => (
    <button data-testid="submit-edit" disabled={isLoading} onClick={() => onSubmit('great prompt')}>Submit</button>
  ),
}));

// The component under test
import EditImageView from '../views/EditImageView';

// Provide a deterministic Image implementation so getImageDimensions works instantly
class MockImage {
  naturalWidth = 100;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_val: string) {
    // simulate async load
    setTimeout(() => this.onload && this.onload());
  }
}

// Helper to create File object
const createFile = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('EditImageView', () => {
  beforeEach(() => {
    uploaderCallbacks.length = 0;
    vi.stubGlobal('Image', MockImage as any);
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('shows error when mask uploaded before original, then succeeds and displays result', async () => {
    // Mock response with correct structure (ImageMetadata)
    editMock.mockResolvedValueOnce({ 
      id: 'test-image-id',
      prompt: 'great prompt',
      parameters: { size: '1024x1024', type: 'edit' },
      filename: 'edited.png',
      timestamp: '2023-01-01T00:00:00Z'
    });
    render(<EditImageView />);

    // uploaderCallbacks[1] corresponds to mask uploader (disabled initially but collected)
    // Upload mask first -> should display error
    await (await import('@testing-library/react')).act(async () => { await uploaderCallbacks[1](createFile('mask.png'), 'preview-mask'); });
    expect(await screen.findByText(/please upload the original image first/i)).toBeInTheDocument();

    // Upload original image -> error disappears
    await (await import('@testing-library/react')).act(async () => { await uploaderCallbacks[0](createFile('orig.png'), 'preview-orig'); });
    await waitFor(() => expect(screen.queryByText(/please upload the original image first/i)).toBeNull());

    // Mask uploader is now enabled; upload mask again with matching dimensions (mocked Image always 100x100)
    await (await import('@testing-library/react')).act(async () => { await uploaderCallbacks[1](createFile('mask.png'), 'preview-mask'); });
    expect(screen.queryByText(/must match the original image dimensions/i)).toBeNull();

    // Submit edit
    fireEvent.click(screen.getByTestId('submit-edit'));
    await waitFor(() => expect(editMock).toHaveBeenCalledTimes(1));

    // Result image should appear
    expect(await screen.findByAltText(/edited result/i)).toBeInTheDocument();
  });
});