import React from 'react';
import { cn } from '../../utils/cn';

const Checkbox = React.forwardRef(({ label, error, className, ...props }, ref) => {
  return (
    <div className="flex items-start">
      <div className="flex h-5 items-center">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "h-4 w-4 appearance-none rounded border border-border/20 bg-background transition-all duration-200",
            "checked:border-primary checked:bg-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus:ring-danger/50",
            className
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`,
          }}
          {...props}
        />
      </div>
      {label && (
        <div className="ml-3 text-sm">
          <label className={cn("font-medium text-gray-200", error && "text-danger")}>
            {label}
          </label>
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export default Checkbox;
