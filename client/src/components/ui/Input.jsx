import React, { forwardRef } from 'react';
import FormError from './FormError';
import './ui.css';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <input
        ref={ref}
        className={`input-field ${error ? 'error' : ''} ${className}`}
        {...props}
      />
      <FormError message={error} />
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
