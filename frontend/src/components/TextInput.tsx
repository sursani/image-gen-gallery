import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ 
  label, 
  error, 
  className,
  id,
  fullWidth = true,
  ...props 
}) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  
  // Inline styles for maximum compatibility
  const inputStyle = {
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    borderColor: error ? '#E53E3E' : '#333333',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '999px',
    padding: '0.5rem 1rem',
    width: fullWidth ? '100%' : undefined
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
    <div style={{ marginBottom: '1.25rem', width: fullWidth ? '100%' : undefined }}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-gray-200 mb-2 text-sm font-medium"
          style={labelStyle}
        >
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={`bg-dark-input text-white border rounded-full px-4 py-2 focus:outline-none transition-all duration-200 ${
          error ? 'border-red-500' : 'border-gray-700'
        } ${fullWidth ? 'w-full' : ''} ${className || ''}`}
        style={inputStyle}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-500" style={errorStyle}>{error}</p>
      )}
    </div>
  );
};

export default TextInput;