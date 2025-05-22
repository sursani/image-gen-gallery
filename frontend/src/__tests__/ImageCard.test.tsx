import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ImageCard from '../components/ImageCard';
import * as clientModule from '../api/client';

describe('ImageCard', () => {
  const metadata = {
    id: '123',
    prompt: 'a cat',
    parameters: null,
    filename: '123.png',
    timestamp: new Date('2024-01-01').toISOString(),
  } as const;

  it('renders image and overlay prompt', () => {
    vi.spyOn(clientModule, 'getImageUrl').mockReturnValue('http://example.com/123.png');
    render(<ImageCard metadata={metadata} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'http://example.com/123.png');
    expect(screen.getByText('a cat')).toBeInTheDocument();
  });

  it('falls back to placeholder on error', () => {
    vi.spyOn(clientModule, 'getImageUrl').mockReturnValue('bad.png');
    render(<ImageCard metadata={metadata} />);
    const img = screen.getByRole('img');
    // trigger error
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', './placeholder.png');
  });
});