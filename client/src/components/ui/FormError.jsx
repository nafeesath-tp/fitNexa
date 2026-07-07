import React from 'react';
import { cn } from '../../utils/cn';

const FormError = ({ error, className }) => {
  if (!error) return null;
  
  // Handle both string errors and React Hook Form error objects
  const message = typeof error === 'string' ? error : error.message;
  
  if (!message) return null;

  return (
    <p className={cn("mt-1 text-sm text-danger", className)}>
      {message}
    </p>
  );
};

export default FormError;
