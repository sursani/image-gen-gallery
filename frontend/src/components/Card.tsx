import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  [key: string]: any; // Allow any other props like data-testid
}

const Card: React.FC<CardProps> = ({ children, className, padding, ...rest }) => {
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
    <div className={combinedClassName} style={style} {...rest}>
      {children}
    </div>
  );
};

export default Card;
