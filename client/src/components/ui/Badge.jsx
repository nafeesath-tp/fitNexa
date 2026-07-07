import React from 'react';
import { cn } from '../../utils/cn';

const Badge = ({ children, variant = 'default', className, ...props }) => {
  const variants = {
    default: "bg-surface text-gray-200 border-border/10",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    outline: "text-gray-300 border-border/20",
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
