import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Button from '../components/Button';

describe('Button Extended Coverage', () => {
  describe('Variant styles', () => {
    it('applies primary variant styles correctly', () => {
      render(<Button variant="primary">Primary Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-dark-button');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('py-2', 'px-4');
    });

    it('applies secondary variant styles correctly', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-dark-surface');
      expect(button).toHaveClass('text-gray-200');
    });

    it('applies outline variant styles correctly', () => {
      render(<Button variant="outline">Outline Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('text-gray-200');
    });

    it('applies icon variant styles correctly', () => {
      render(<Button variant="icon">Icon</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('p-2');
      expect(button).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('uses primary as default variant', () => {
      render(<Button>Default Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-dark-button');
    });
  });

  describe('Hover behavior', () => {
    it('changes primary button background on hover', async () => {
      render(<Button variant="primary">Hover Test</Button>);
      
      const button = screen.getByRole('button');
      
      // Initial state
      expect(button).toHaveStyle({ backgroundColor: '#252525' });
      
      // Hover state
      fireEvent.mouseEnter(button);
      await waitFor(() => {
        expect(button).toHaveStyle({ backgroundColor: '#3366FF' });
      });
      
      // Leave hover state
      fireEvent.mouseLeave(button);
      await waitFor(() => {
        expect(button).toHaveStyle({ backgroundColor: '#252525' });
      });
    });

    it('does not change background for non-primary variants on hover', async () => {
      render(<Button variant="secondary">Secondary Hover</Button>);
      
      const button = screen.getByRole('button');
      
      // Initial state
      expect(button).toHaveStyle({ backgroundColor: '#1E1E1E' });
      
      // Hover state - should not change
      fireEvent.mouseEnter(button);
      await waitFor(() => {
        expect(button).toHaveStyle({ backgroundColor: '#1E1E1E' });
      });
    });

    it('calls custom onMouseEnter and onMouseLeave handlers', () => {
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      
      render(
        <Button 
          onMouseEnter={onMouseEnter} 
          onMouseLeave={onMouseLeave}
        >
          Custom Handlers
        </Button>
      );
      
      const button = screen.getByRole('button');
      
      fireEvent.mouseEnter(button);
      expect(onMouseEnter).toHaveBeenCalledTimes(1);
      
      fireEvent.mouseLeave(button);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props and attributes', () => {
    it('passes through HTML button attributes', () => {
      render(
        <Button 
          type="submit" 
          disabled 
          data-testid="custom-button"
          aria-label="Submit form"
        >
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-testid', 'custom-button');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });

    it('combines custom className with variant classes', () => {
      render(<Button className="custom-class">Custom Class</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('bg-dark-button'); // Still has variant classes
    });

    it('handles onClick events', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('applies disabled styles when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
      expect(button).toBeDisabled();
    });
  });

  describe('Base styles', () => {
    it('always applies base styles regardless of variant', () => {
      const variants: Array<'primary' | 'secondary' | 'outline' | 'icon'> = ['primary', 'secondary', 'outline', 'icon'];
      
      variants.forEach(variant => {
        render(<Button variant={variant}>{variant} Button</Button>);
        const button = screen.getByText(`${variant} Button`);
        
        expect(button).toHaveClass('font-medium');
        expect(button).toHaveClass('rounded-full');
        expect(button).toHaveClass('transition-all');
        expect(button).toHaveClass('duration-200');
      });
    });

    it('always applies consistent inline styles', () => {
      render(<Button>Style Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        color: '#FFFFFF',
        borderColor: '#333333',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '999px'
      });
    });
  });

  describe('Children content', () => {
    it('renders text children correctly', () => {
      render(<Button>Simple Text</Button>);
      expect(screen.getByText('Simple Text')).toBeInTheDocument();
    });

    it('renders JSX children correctly', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      
      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('renders complex content correctly', () => {
      render(
        <Button variant="icon">
          <svg width="16" height="16" data-testid="svg-icon">
            <circle cx="8" cy="8" r="4" />
          </svg>
        </Button>
      );
      
      expect(screen.getByTestId('svg-icon')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles empty className gracefully', () => {
      render(<Button className="">Empty Class</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('undefined');
      expect(button.className.trim()).not.toEndWith(' ');
    });

    it('handles null className gracefully', () => {
      render(<Button className={null as any}>Null Class</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('null');
    });

    it('maintains hover state across multiple interactions', async () => {
      render(<Button variant="primary">Multi Hover</Button>);
      
      const button = screen.getByRole('button');
      
      // Multiple hover cycles
      for (let i = 0; i < 3; i++) {
        fireEvent.mouseEnter(button);
        await waitFor(() => {
          expect(button).toHaveStyle({ backgroundColor: '#3366FF' });
        });
        
        fireEvent.mouseLeave(button);
        await waitFor(() => {
          expect(button).toHaveStyle({ backgroundColor: '#252525' });
        });
      }
    });
  });
});