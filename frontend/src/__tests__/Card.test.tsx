import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../components/Card';

describe('Card', () => {
  it('renders with default padding when none is supplied', () => {
    render(
      <Card>
        <p data-testid="child">Content</p>
      </Card>
    );
    const wrapper = screen.getByTestId('child').parentElement as HTMLElement;
    expect(wrapper.className).toContain('p-6');
  });

  it('applies custom padding class', () => {
    render(
      <Card padding="p-2" data-testid="card">
        Custom
      </Card>
    );
    const card = screen.getByText('Custom').parentElement as HTMLElement;
    expect(card.className).toContain('p-2');
  });
});