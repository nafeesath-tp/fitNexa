import React, { forwardRef } from 'react';
import FormError from './FormError';
import './ui.css';

const Checkbox = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`input-wrapper ${className}`} style={{ marginBottom: '0.5rem' }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.95rem' }}>
        <input
          type="checkbox"
          ref={ref}
          style={{ marginTop: '0.25rem', marginRight: '0.5rem', cursor: 'pointer' }}
          {...props}
        />
        <span style={{ lineHeight: '1.4' }}>{label}</span>
      </label>
      <FormError message={error} />
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
