import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const Select = React.forwardRef(({ className, error, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-11 w-full appearance-none rounded-lg border border-border/10 bg-background px-3 py-2 text-sm text-gray-100 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger focus:ring-danger/50 focus:border-danger",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
        <ChevronDown size={18} />
      </div>
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
