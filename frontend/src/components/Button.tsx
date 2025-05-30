import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'icon';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  // Track hover state so inline styles can react accordingly
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    onMouseLeave?.(e);
  };

  // Using direct inline styles as fallback
  const baseStyle = 'font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-dark-button text-white border border-dark-border py-2 px-4',
    secondary: 'bg-dark-surface text-gray-200 border border-dark-border py-2 px-4',
    outline: 'bg-transparent text-gray-200 border border-dark-border py-2 px-4',
    icon: 'bg-transparent text-gray-200 border border-dark-border p-2 flex items-center justify-center'
  };

  const combinedClassName = `${baseStyle} ${variantStyles[variant]} ${className || ''}`.trim();

  // Define inline styles for maximum compatibility
  const style = {
    backgroundColor:
      variant === 'primary'
        ? isHovered
          ? '#3366FF'
          : '#252525'
        : variant === 'secondary'
        ? '#1E1E1E'
        : 'transparent',
    color: '#FFFFFF',
    borderColor: '#333333',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '999px'
  };

  return (
    <button
      className={combinedClassName}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
