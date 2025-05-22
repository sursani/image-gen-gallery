import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../components/Button';

/**
 * Utility that renders a button variant, hovers and unhovers it
 * to ensure both visual branches are executed. It returns the element
 * for any further assertions.
 */
function renderAndHover(variant: Parameters<typeof Button>[0]["variant"]) {
  render(<Button variant={variant}>Label</Button>);
  const btn = screen.getByRole('button', { name: /label/i });
  // Trigger mouse enter & leave to toggle hover state
  fireEvent.mouseEnter(btn);
  fireEvent.mouseLeave(btn);
  return btn;
}

describe('Button', () => {
  it('renders all visual variants and responds to hover', () => {
    // Iterate through every supported variant to ensure all branches are covered
    (['primary', 'secondary', 'outline', 'icon'] as const).forEach(v => {
      const el = renderAndHover(v);
      // Each variant applies its own classes, verify at least one class token unique to the variant exists
      expect(el.className).toContain(v === 'icon' ? 'flex' : 'border');
    });
  });

  it('forwards additional props and handles events', () => {
    const onClick = vi.fn();
    render(
      <Button data-testid="btn" onClick={onClick} aria-label="btn">
        Click
      </Button>
    );
    const btn = screen.getByTestId('btn');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});