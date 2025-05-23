import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorMessage from '../components/ErrorMessage';

describe('ErrorMessage Extended Coverage', () => {
  describe('Rendering conditions', () => {
    it('renders nothing when message is null', () => {
      const { container } = render(<ErrorMessage message={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when message is empty string', () => {
      const { container } = render(<ErrorMessage message="" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders error message when message is provided', () => {
      render(<ErrorMessage message="Something went wrong" />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Title behavior', () => {
    it('uses "Error" as default title', () => {
      render(<ErrorMessage message="Test error" />);
      
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('uses custom title when provided', () => {
      render(<ErrorMessage message="Validation failed" title="Validation Error" />);
      
      expect(screen.getByText('Validation Error')).toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    it('handles empty string title', () => {
      render(<ErrorMessage message="Test error" title="" />);
      
      const titleElement = screen.getByRole('alert').querySelector('.font-bold');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveClass('font-bold');
    });

    it('handles special characters in title', () => {
      render(<ErrorMessage message="Test" title="Error: (Code 500)" />);
      
      expect(screen.getByText('Error: (Code 500)')).toBeInTheDocument();
    });
  });

  describe('Message content', () => {
    it('displays simple text messages', () => {
      render(<ErrorMessage message="Simple error message" />);
      
      expect(screen.getByText('Simple error message')).toBeInTheDocument();
    });

    it('handles multi-line messages', () => {
      const multiLineMessage = "Line 1\nLine 2\nLine 3";
      render(<ErrorMessage message={multiLineMessage} />);
      
      expect(screen.getByText(/Line 1.*Line 2.*Line 3/s)).toBeInTheDocument();
    });

    it('handles messages with special characters', () => {
      const specialMessage = "Error: Invalid JSON at line 42, column 7 - unexpected token '{'";
      render(<ErrorMessage message={specialMessage} />);
      
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('handles very long messages', () => {
      const longMessage = "This is a very long error message that might wrap to multiple lines. ".repeat(10);
      render(<ErrorMessage message={longMessage} />);
      
      expect(screen.getByText((content, element) => {
        return element?.textContent === longMessage;
      })).toBeInTheDocument();
    });

    it('handles messages with HTML entities', () => {
      const messageWithEntities = "Error: 'username' & 'password' are required";
      render(<ErrorMessage message={messageWithEntities} />);
      
      expect(screen.getByText(messageWithEntities)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper role for screen readers', () => {
      render(<ErrorMessage message="Accessibility test" />);
      
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toBeInTheDocument();
    });

    it('maintains semantic structure', () => {
      render(<ErrorMessage message="Semantic test" title="Custom Title" />);
      
      const container = screen.getByRole('alert');
      const title = screen.getByText('Custom Title');
      const message = screen.getByText('Semantic test');
      
      expect(container).toContainElement(title);
      expect(container).toContainElement(message);
    });
  });

  describe('CSS classes and styling', () => {
    it('applies correct container classes', () => {
      render(<ErrorMessage message="Style test" />);
      
      const container = screen.getByRole('alert');
      expect(container).toHaveClass(
        'mt-md',
        'p-md',
        'border',
        'rounded-ui-md',
        'bg-dark-elevated',
        'border-red-800'
      );
    });

    it('applies correct title classes', () => {
      render(<ErrorMessage message="Title style test" title="Test Title" />);
      
      const title = screen.getByText('Test Title');
      expect(title).toHaveClass('font-bold', 'mb-2', 'text-red-400');
    });

    it('applies correct message classes', () => {
      render(<ErrorMessage message="Message style test" />);
      
      const message = screen.getByText('Message style test');
      expect(message).toHaveClass('text-sm', 'text-dark-text-secondary');
    });
  });

  describe('Edge cases', () => {
    it('handles whitespace-only message', () => {
      const { container } = render(<ErrorMessage message="   " />);
      
      // Whitespace-only string is truthy, so it should render
      expect(container.firstChild).not.toBeNull();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('handles numeric message (converted to string)', () => {
      render(<ErrorMessage message={'404' as any} />);
      
      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('handles message with only special characters', () => {
      render(<ErrorMessage message="!@#$%^&*()" />);
      
      expect(screen.getByText('!@#$%^&*()')).toBeInTheDocument();
    });

    it('handles unicode characters in message', () => {
      render(<ErrorMessage message="Error: файл не найден 🚨" />);
      
      expect(screen.getByText('Error: файл не найден 🚨')).toBeInTheDocument();
    });

    it('maintains structure with complex title and message', () => {
      const complexTitle = "🚨 Critical System Error";
      const complexMessage = "Database connection failed: timeout after 30s\nPlease try again later.";
      
      render(<ErrorMessage message={complexMessage} title={complexTitle} />);
      
      expect(screen.getByText(complexTitle)).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent === complexMessage;
      })).toBeInTheDocument();
    });
  });
});