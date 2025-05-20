import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

const Card: React.FC<CardProps> = ({ children, className, padding }) => {
  const pad = padding || 'p-10';
  const combinedClassName = `${pad} bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className || ''}`.trim();
  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};

export default Card;
