import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
      {/* Updated spinner to use theme-consistent colors */}
      <div
        className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-purple-500 dark:border-purple-400"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
