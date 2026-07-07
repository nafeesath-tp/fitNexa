import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const Button = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading = false, 
  disabled, 
  className,
  ...props 
}, ref) => {
  
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-background hover:bg-primary-hover shadow-md shadow-primary/20",
    secondary: "bg-secondary text-white hover:bg-secondary-hover border border-white/5",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary/10",
    danger: "bg-danger text-white hover:bg-red-600 shadow-md shadow-danger/20",
    ghost: "bg-transparent text-muted hover:text-white hover:bg-white/5"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
