import React from 'react';

interface ErrorMessageProps {
  message: string | null;
  title?: string;
}

function ErrorMessage({ message, title = 'Error' }: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-red-900 border border-red-700 text-red-100 rounded-lg shadow-md" role="alert">
      <p className="font-bold text-red-50 mb-1">{title}:</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default ErrorMessage; 