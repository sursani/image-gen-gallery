import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default size md', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('ui-spinner');
  });

  it('renders with all size options', () => {
    (['sm', 'md', 'lg'] as const).forEach(size => {
      render(<LoadingSpinner size={size} />);
      expect(screen.getAllByRole('status').pop()).toHaveClass('ui-spinner');
    });
  });
});