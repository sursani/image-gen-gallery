import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageUploader from '../components/ImageUploader';

// Mock react-dropzone entirely so we can control the behaviour of the hook
let dropzoneArgs: any;
vi.mock('react-dropzone', () => {
  return {
    useDropzone: (args: any) => {
      // Save the arguments so tests can trigger onDrop manually
      dropzoneArgs = args;
      return {
        getRootProps: () => ({ onClick: () => {} }),
        getInputProps: () => ({}),
        isDragActive: false,
        isDragAccept: false,
        isDragReject: false,
      };
    }
  };
});

// JSDOM provides a URL global; patch its methods so the component can generate previews without throwing
(globalThis.URL as any).createObjectURL = vi.fn(() => 'blob:preview');
(globalThis.URL as any).revokeObjectURL = vi.fn();

const createFile = (name: string, type = 'image/png', size = 1024) => {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
};

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles successful image drop and preview rendering', async () => {
    const onUpload = vi.fn();
    render(<ImageUploader onImageUpload={onUpload} />);

    const file = createFile('test.png');
    // Simulate the drop event through captured onDrop callback
    await dropzoneArgs.onDrop([file], []);

    // onImageUpload should have been called with file and preview url
    expect(onUpload).toHaveBeenCalledWith(file, 'blob:preview');
    // Preview image should be rendered with the generated object URL
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:preview');
  });

  it('shows error message for invalid file type', async () => {
    render(<ImageUploader onImageUpload={vi.fn()} />);

    const rejection = {
      errors: [{ code: 'file-invalid-type', message: 'wrong type' }],
    };
    await dropzoneArgs.onDrop([], [rejection]);

    expect(await screen.findByText(/invalid file type/i)).toBeInTheDocument();
  });

  it('shows error for file too large', async () => {
    render(<ImageUploader onImageUpload={vi.fn()} />);

    const rejection = {
      errors: [{ code: 'file-too-large', message: 'too big' }],
    };
    await dropzoneArgs.onDrop([], [rejection]);

    expect(await screen.findByText(/maximum size/i)).toBeInTheDocument();
  });

  it('does nothing when disabled', async () => {
    const onUpload = vi.fn();
    render(<ImageUploader onImageUpload={onUpload} disabled />);

    const file = createFile('test.png');
    await dropzoneArgs.onDrop([file], []);

    // Early-return means callback not invoked and no preview rendered
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.queryByRole('img')).toBeNull();
  });
});