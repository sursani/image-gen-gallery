import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

const Card: React.FC<CardProps> = ({ children, className, padding }) => {
  const pad = padding || 'p-6';
  const combinedClassName = `${pad} bg-dark-surface border border-dark-border rounded-lg transition-all duration-200 ${className || ''}`.trim();
  
  // Inline styles as fallback
  const style = {
    backgroundColor: '#1E1E1E',
    borderColor: '#333333',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '12px',
    padding: padding ? undefined : '1.5rem'
  };
  
  return (
    <div className={combinedClassName} style={style}>
      {children}
    </div>
  );
};

export default Card;
