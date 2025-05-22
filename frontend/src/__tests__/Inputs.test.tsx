import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextInput from '../components/TextInput';
import TextArea from '../components/TextArea';
import Toggle from '../components/Toggle';

describe('Form Inputs', () => {
  it('TextInput shows label, handles typing and error', () => {
    render(<TextInput label="Name" error="Oops" placeholder="enter" />);
    const input = screen.getByPlaceholderText('enter') as HTMLInputElement;
    expect(screen.getByText('Name')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input.value).toBe('abc');
    expect(screen.getByText('Oops')).toBeInTheDocument();
  });

  it('TextArea behaves similarly', () => {
    render(<TextArea label="Desc" error="bad" placeholder="start" />);
    const area = screen.getByPlaceholderText('start') as HTMLTextAreaElement;
    fireEvent.change(area, { target: { value: 'hello' } });
    expect(area.value).toBe('hello');
    expect(screen.getByText('bad')).toBeInTheDocument();
  });

  it('Toggle triggers callback and reflects aria-pressed', () => {
    const cb = vi.fn();
    const Wrapper = () => {
      const [on, setOn] = React.useState(false);
      return <Toggle isOn={on} onToggle={() => { setOn(!on); cb(); }} label="Enable" />;
    };
    render(<Wrapper />);
    const btn = screen.getByRole('button', { name: /enable/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(cb).toHaveBeenCalled();
  });
});