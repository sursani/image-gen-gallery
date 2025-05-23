import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toggle from '../components/Toggle';

describe('Toggle Extended Coverage', () => {
  it('renders without label correctly', () => {
    const onToggle = vi.fn();
    render(<Toggle isOn={false} onToggle={onToggle} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('handles disabled state correctly', () => {
    const onToggle = vi.fn();
    render(<Toggle isOn={true} onToggle={onToggle} disabled={true} label="Disabled Toggle" />);
    
    const button = screen.getByRole('button', { name: /disabled toggle/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    
    // Should not call onToggle when disabled
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows correct visual state when isOn is true', () => {
    const onToggle = vi.fn();
    render(<Toggle isOn={true} onToggle={onToggle} label="Active Toggle" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('bg-dark-toggle-active');
  });

  it('shows correct visual state when isOn is false', () => {
    const onToggle = vi.fn();
    render(<Toggle isOn={false} onToggle={onToggle} label="Inactive Toggle" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveClass('bg-dark-toggle-inactive');
  });

  it('has proper accessibility attributes', () => {
    const onToggle = vi.fn();
    render(<Toggle isOn={false} onToggle={onToggle} label="Accessibility Test" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-pressed');
    
    const srOnly = screen.getByText('Toggle Accessibility Test');
    expect(srOnly).toHaveClass('sr-only');
  });

  it('handles label with special characters', () => {
    const onToggle = vi.fn();
    render(<Toggle isOn={false} onToggle={onToggle} label="Enable Dark Mode (Beta)" />);
    
    expect(screen.getByText('Enable Dark Mode (Beta)')).toBeInTheDocument();
    expect(screen.getByText('Toggle Enable Dark Mode (Beta)')).toBeInTheDocument();
  });

  it('handles rapid toggling', () => {
    const onToggle = vi.fn();
    render(<Toggle isOn={false} onToggle={onToggle} label="Rapid Toggle" />);
    
    const button = screen.getByRole('button');
    
    // Simulate rapid clicks
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('maintains proper CSS classes when disabled and active', () => {
    const onToggle = vi.fn();
    render(<Toggle isOn={true} onToggle={onToggle} disabled={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-dark-toggle-active');
    expect(button).toHaveClass('opacity-50');
    expect(button).toHaveClass('cursor-not-allowed');
  });
});