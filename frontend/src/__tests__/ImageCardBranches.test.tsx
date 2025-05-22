import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImageCard from '../components/ImageCard';
import * as clientModule from '../api/client';

describe('ImageCard extra branches', () => {
  it('ignores subsequent image errors (branch coverage)', () => {
    vi.spyOn(clientModule, 'getImageUrl').mockReturnValue('bad.png');
    const metadata = {
      id: 'x',
      prompt: 'p',
      parameters: null,
      filename: 'x.png',
      timestamp: new Date().toISOString(),
    } as const;
    render(<ImageCard metadata={metadata} />);
    const img = screen.getByRole('img');
    // First error triggers fallback
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', './placeholder.png');
    // Second error should not change state or throw (covers !imageLoadFailed branch false)
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', './placeholder.png');
  });
});