import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className,
  ...props
}) => {
  const baseStyle = 'font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-black',
    secondary: 'bg-gray-600 text-gray-100 hover:bg-gray-500 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-black',
    outline: `
      bg-transparent 
      border-2 border-purple-500 dark:border-purple-400 
      text-purple-500 dark:text-purple-400 
      hover:bg-purple-500 hover:text-white 
      dark:hover:bg-purple-400 dark:hover:text-black 
      focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-2 dark:focus:ring-offset-black
    `
  };

  const combinedClassName = `${baseStyle} ${variantStyles[variant]} ${className || ''}`.trim();

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};

export default Button; 