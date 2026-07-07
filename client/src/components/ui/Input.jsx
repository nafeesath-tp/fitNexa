import React from 'react';
import { cn } from '../../utils/cn';

const Input = React.forwardRef(({ className, error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-lg border border-border/10 bg-background px-3 py-2 text-sm text-gray-100 placeholder:text-muted transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-danger focus:ring-danger/50 focus:border-danger",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
export default Input;
