import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
      {/* Simple Tailwind spinner using border */}
      <div 
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner; 