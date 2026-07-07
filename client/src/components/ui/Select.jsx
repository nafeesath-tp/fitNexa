import React, { forwardRef } from 'react';
import FormError from './FormError';
import './ui.css';

const Select = forwardRef(({ label, error, options = [], className = '', ...props }, ref) => {
  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <select
        ref={ref}
        className={`input-field ${error ? 'error' : ''} ${className}`}
        {...props}
      >
        <option value="" disabled>Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FormError message={error} />
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
