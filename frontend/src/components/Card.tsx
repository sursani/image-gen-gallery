import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  const combinedClassName = `p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className || ''}`.trim();
  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};

export default Card;
