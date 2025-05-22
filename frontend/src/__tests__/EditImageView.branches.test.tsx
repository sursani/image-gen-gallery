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

// Mock ImageEditForm to expose submit button that triggers onSubmit
vi.mock('../components/ImageEditForm', () => ({
  __esModule: true,
  default: ({ onSubmit, isLoading }: any) => (
    <button disabled={isLoading} onClick={() => onSubmit('prompt')} data-testid="apply-edit">
      Apply
    </button>
  ),
}));

const editMock = vi.fn();
vi.mock('../api/imageEditing', () => ({
  editImage: (...args: any[]) => editMock(...args),
}));

import EditImageView from '../views/EditImageView';

const createFile = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('EditImageView API failure handling', () => {
  beforeEach(() => { uploaderCallbacks.length = 0; vi.restoreAllMocks(); vi.clearAllMocks(); });
  afterEach(() => cleanup());

  const setupAndUpload = async () => {
    // Ensure Image loads fine
    // @ts-ignore
    global.Image = class { onload:any; set src(_s:string){ this.onload&&this.onload(); } naturalWidth=100; naturalHeight=100; };
    render(<EditImageView />);
    // Wait for uploader to register
    await waitFor(() => expect(uploaderCallbacks.length).toBeGreaterThan(0));
    await act(async () => uploaderCallbacks[0](createFile('orig.png'), 'orig'));
    // Wait for apply button to appear
    await screen.findByTestId('apply-edit');
  };

  it('shows boom message when editImage rejects with Error', async () => {
    editMock.mockRejectedValueOnce(new Error('boom'));
    await setupAndUpload();
    fireEvent.click(screen.getByTestId('apply-edit'));
    await waitFor(() => expect(editMock).toHaveBeenCalled());
    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
  });

  it('shows default message when editImage rejects with non Error', async () => {
    // reject with empty object
    editMock.mockRejectedValueOnce({});
    await setupAndUpload();
    fireEvent.click(screen.getByTestId('apply-edit'));
    await waitFor(() => expect(editMock).toHaveBeenCalled());
    expect(await screen.findByText(/failed to edit image/i)).toBeInTheDocument();
  });
});