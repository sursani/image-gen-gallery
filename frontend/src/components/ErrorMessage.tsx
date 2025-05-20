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
    <div
      className="mt-md p-md border rounded-ui-md bg-dark-elevated border-red-800"
      role="alert"
    >
      <p className="font-bold mb-2 text-red-400">{title}</p>
      <p className="text-sm text-dark-text-secondary">{message}</p>
    </div>
  );
}

export default ErrorMessage;
