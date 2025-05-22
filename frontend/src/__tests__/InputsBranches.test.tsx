import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TextArea from '../components/TextArea';
import TextInput from '../components/TextInput';

describe('TextArea & TextInput branch coverage', () => {
  it('renders TextArea without fullWidth and no error', () => {
    render(<TextArea label="Note" fullWidth={false} rows={2} placeholder="n" />);
    const area = screen.getByPlaceholderText('n');
    // style attribute should not include width: 100% when fullWidth false
    expect(area).not.toHaveStyle({ width: '100%' });
  });

  it('renders TextArea with error styles', () => {
    render(<TextArea error="bad" placeholder="err" />);
    const area = screen.getByPlaceholderText('err');
    expect(area).toHaveClass('border-red-500');
    expect(screen.getByText('bad')).toBeInTheDocument();
  });

  it('renders TextInput without fullWidth and with error', () => {
    render(<TextInput error="oops" fullWidth={false} placeholder="p" />);
    const input = screen.getByPlaceholderText('p');
    expect(input).toHaveClass('border-red-500');
    expect(input).not.toHaveStyle({ width: '100%' });
  });
});