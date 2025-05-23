import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextInput from '../components/TextInput';
import TextArea from '../components/TextArea';

describe('Inputs Extended Coverage', () => {
  describe('TextInput edge cases', () => {
    it('generates unique IDs when none provided', () => {
      render(
        <div>
          <TextInput placeholder="first" />
          <TextInput placeholder="second" />
        </div>
      );
      
      const firstInput = screen.getByPlaceholderText('first');
      const secondInput = screen.getByPlaceholderText('second');
      
      expect(firstInput.id).toBeTruthy();
      expect(secondInput.id).toBeTruthy();
      expect(firstInput.id).not.toBe(secondInput.id);
    });

    it('uses provided ID correctly', () => {
      render(<TextInput id="custom-id" label="Custom Input" />);
      
      const input = screen.getByLabelText('Custom Input');
      expect(input.id).toBe('custom-id');
    });

    it('passes through HTML input attributes', () => {
      render(
        <TextInput 
          placeholder="test" 
          type="email" 
          required 
          maxLength={100}
          autoComplete="email"
        />
      );
      
      const input = screen.getByPlaceholderText('test');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('maxLength', '100');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });

    it('combines custom className with default classes', () => {
      render(<TextInput placeholder="styled" className="custom-class" />);
      
      const input = screen.getByPlaceholderText('styled');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('bg-dark-input');
    });

    it('handles focus and blur events', () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      
      render(<TextInput placeholder="focus-test" onFocus={onFocus} onBlur={onBlur} />);
      
      const input = screen.getByPlaceholderText('focus-test');
      fireEvent.focus(input);
      expect(onFocus).toHaveBeenCalled();
      
      fireEvent.blur(input);
      expect(onBlur).toHaveBeenCalled();
    });

    it('applies error styling correctly', () => {
      render(<TextInput placeholder="error-test" error="Invalid input" />);
      
      const input = screen.getByPlaceholderText('error-test');
      expect(input).toHaveClass('border-red-500');
      expect(input).not.toHaveClass('border-gray-700');
    });
  });

  describe('TextArea edge cases', () => {
    it('generates unique IDs when none provided', () => {
      render(
        <div>
          <TextArea placeholder="first-area" />
          <TextArea placeholder="second-area" />
        </div>
      );
      
      const firstArea = screen.getByPlaceholderText('first-area');
      const secondArea = screen.getByPlaceholderText('second-area');
      
      expect(firstArea.id).toBeTruthy();
      expect(secondArea.id).toBeTruthy();
      expect(firstArea.id).not.toBe(secondArea.id);
    });

    it('uses provided ID correctly', () => {
      render(<TextArea id="custom-textarea-id" label="Custom TextArea" />);
      
      const textarea = screen.getByLabelText('Custom TextArea');
      expect(textarea.id).toBe('custom-textarea-id');
    });

    it('handles custom rows attribute', () => {
      render(<TextArea placeholder="rows-test" rows={6} />);
      
      const textarea = screen.getByPlaceholderText('rows-test');
      expect(textarea).toHaveAttribute('rows', '6');
    });

    it('uses default rows when not specified', () => {
      render(<TextArea placeholder="default-rows" />);
      
      const textarea = screen.getByPlaceholderText('default-rows');
      expect(textarea).toHaveAttribute('rows', '4');
    });

    it('passes through HTML textarea attributes', () => {
      render(
        <TextArea 
          placeholder="textarea-test" 
          required 
          maxLength={500}
          autoComplete="off"
          spellCheck={false}
        />
      );
      
      const textarea = screen.getByPlaceholderText('textarea-test');
      expect(textarea).toHaveAttribute('required');
      expect(textarea).toHaveAttribute('maxLength', '500');
      expect(textarea).toHaveAttribute('autoComplete', 'off');
      expect(textarea).toHaveAttribute('spellCheck', 'false');
    });

    it('combines custom className with default classes', () => {
      render(<TextArea placeholder="styled-area" className="custom-textarea-class" />);
      
      const textarea = screen.getByPlaceholderText('styled-area');
      expect(textarea).toHaveClass('custom-textarea-class');
      expect(textarea).toHaveClass('bg-dark-input');
    });

    it('handles change events correctly', () => {
      const onChange = vi.fn();
      render(<TextArea placeholder="change-test" onChange={onChange} />);
      
      const textarea = screen.getByPlaceholderText('change-test');
      fireEvent.change(textarea, { target: { value: 'new content' } });
      
      expect(onChange).toHaveBeenCalled();
    });

    it('applies correct width styling when fullWidth is false', () => {
      render(<TextArea placeholder="width-test" fullWidth={false} />);
      
      const textarea = screen.getByPlaceholderText('width-test');
      expect(textarea).not.toHaveClass('w-full');
    });

    it('shows error message with correct styling', () => {
      render(<TextArea placeholder="error-area" error="TextArea error message" />);
      
      const errorMessage = screen.getByText('TextArea error message');
      expect(errorMessage).toHaveClass('text-red-500');
      expect(errorMessage).toHaveClass('text-sm');
      expect(errorMessage).toHaveClass('mt-1');
    });
  });

  describe('Label behavior', () => {
    it('associates label with input correctly', () => {
      render(<TextInput id="labeled-input" label="Associated Label" />);
      
      const label = screen.getByText('Associated Label');
      const input = screen.getByLabelText('Associated Label');
      
      expect(label).toHaveAttribute('for', 'labeled-input');
      expect(input.id).toBe('labeled-input');
    });

    it('associates label with textarea correctly', () => {
      render(<TextArea id="labeled-textarea" label="Associated TextArea Label" />);
      
      const label = screen.getByText('Associated TextArea Label');
      const textarea = screen.getByLabelText('Associated TextArea Label');
      
      expect(label).toHaveAttribute('for', 'labeled-textarea');
      expect(textarea.id).toBe('labeled-textarea');
    });
  });
});