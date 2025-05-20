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
      className="mt-6 p-4 border rounded-lg shadow-md
                 bg-red-50 border-red-300 text-red-700
                 dark:bg-red-800 dark:bg-opacity-30 dark:border-red-600 dark:text-red-200"
      role="alert"
    >
      <p className="font-bold mb-1 text-red-700 dark:text-red-100">{title}</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default ErrorMessage;
