import React from 'react';

interface ToggleProps {
  isOn: boolean;
  onToggle: () => void;
  label?: string;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ 
  isOn, 
  onToggle, 
  label, 
  disabled = false 
}) => {
  return (
    <div className="flex items-center">
      {label && (
        <span className="text-dark-text-secondary mr-3">{label}</span>
      )}
      
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-ui-pill border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isOn ? 'bg-dark-toggle-active' : 'bg-dark-toggle-inactive'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-pressed={isOn}
      >
        <span className="sr-only">Toggle {label}</span>
        <span
          className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-dark-text-primary shadow transition duration-200 ease-in-out ${
            isOn ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export default Toggle;