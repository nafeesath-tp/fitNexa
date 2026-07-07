import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

const PasswordInput = React.forwardRef(({ className, error, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-lg border border-border/10 bg-background px-3 py-2 text-sm text-gray-100 placeholder:text-muted transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger focus:ring-danger/50 focus:border-danger",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-gray-200 focus:outline-none transition-colors"
        tabIndex="-1"
      >
        {showPassword ? (
          <EyeOff size={18} />
        ) : (
          <Eye size={18} />
        )}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
export default PasswordInput;
