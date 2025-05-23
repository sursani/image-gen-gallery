import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock heavy child views to simple placeholders so rendering is fast and deterministic
vi.mock('../components/GalleryView', () => ({ 
  default: React.forwardRef(() => <div data-testid="gallery">Gallery</div>) 
}));
vi.mock('../components/ImageGenerationForm', () => ({ default: () => <div data-testid="create">Create</div> }));
vi.mock('../views/EditImageView', () => ({ default: () => <div data-testid="edit">Edit</div> }));

describe('App top-level routing & navigation', () => {
  // jsdom starts at about:blank; push a fake starting path
  window.history.replaceState({}, '', '/');

  it('renders gallery by default and navigates between views', async () => {
    render(<App />);

    // Default to gallery
    expect(screen.getByTestId('gallery')).toBeInTheDocument();

    // Click create button
    fireEvent.click(screen.getByRole('button', { name: /create image/i }));
    expect(screen.getByTestId('create')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/create'));

    // Click edit button
    fireEvent.click(screen.getByRole('button', { name: /edit image/i }));
    expect(screen.getByTestId('edit')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/edit'));

    // Click gallery button
    fireEvent.click(screen.getByRole('button', { name: /view gallery/i }));
    expect(screen.getByTestId('gallery')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});