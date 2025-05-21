import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

const TextArea: React.FC<TextAreaProps> = ({ 
  label, 
  error, 
  className,
  id,
  fullWidth = true,
  rows = 4,
  ...props 
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
  
  // Inline styles for direct control
  const textareaStyle = {
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    borderColor: error ? '#E53E3E' : '#333333',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    width: fullWidth ? '100%' : undefined,
    resize: 'none' as 'none',
    boxSizing: 'border-box' as 'border-box',
    maxWidth: '100%'
  };
  
  const labelStyle = {
    display: 'block',
    color: '#DDDDDD',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500
  };
  
  const errorStyle = {
    marginTop: '0.25rem',
    fontSize: '0.875rem',
    color: '#E53E3E'
  };
  
  return (
    <div style={{ marginBottom: '1rem', width: fullWidth ? '100%' : undefined, maxWidth: '100%' }}>
      {label && (
        <label 
          htmlFor={textareaId} 
          className="block text-gray-200 mb-2 text-sm font-medium"
          style={labelStyle}
        >
          {label}
        </label>
      )}
      
      <textarea
        id={textareaId}
        rows={rows}
        className={`bg-dark-input text-white border rounded-lg px-4 py-2 focus:outline-none transition-all duration-200 resize-none ${
          error ? 'border-red-500' : 'border-gray-700'
        } ${fullWidth ? 'w-full' : ''} ${className || ''}`}
        style={textareaStyle}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-500" style={errorStyle}>{error}</p>
      )}
    </div>
  );
};

export default TextArea;