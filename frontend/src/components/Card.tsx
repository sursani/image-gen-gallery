import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  const combinedClassName = `bg-gray-800 p-4 rounded-lg shadow-md ${className || ''}`.trim();
  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};

export default Card; 