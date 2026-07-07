import React from 'react';
import { cn } from '../../utils/cn';

const RadioGroup = ({ children, className }) => {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {children}
    </div>
  );
};

export default RadioGroup;

export const RadioOption = React.forwardRef(({ label, icon: Icon, error, className, ...props }, ref) => {
  return (
    <label className={cn(
      "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border p-4 text-center transition-all duration-200",
      "hover:bg-surface focus-within:ring-2 focus-within:ring-primary/50",
      "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary",
      error ? "border-danger text-danger" : "border-border/10 text-muted",
      className
    )}>
      <input
        type="radio"
        ref={ref}
        className="sr-only"
        {...props}
      />
      {Icon && <Icon className="mb-2 h-6 w-6" />}
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
});

RadioOption.displayName = 'RadioOption';
