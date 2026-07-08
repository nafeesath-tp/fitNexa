import React from 'react';
import { cn } from '../../utils/cn';

export const FormSection = ({ title, description, children, className }) => (
  <div className={cn("space-y-6 bg-surface p-6 rounded-xl border border-border/10", className)}>
    <div>
      <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
      {description && <p className="text-sm text-muted mt-1">{description}</p>}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export const FormField = ({ children, className }) => (
  <div className={cn("flex flex-col space-y-1.5", className)}>
    {children}
  </div>
);

export const FormLabel = ({ children, className, htmlFor }) => (
  <label htmlFor={htmlFor} className={cn("text-sm font-medium text-gray-200", className)}>
    {children}
  </label>
);

export const FormError = ({ message, error, className }) => {
  const displayMessage = message || error?.message;
  if (!displayMessage) return null;
  return (
    <p className={cn("text-sm text-danger mt-1", className)}>
      {displayMessage}
    </p>
  );
};
