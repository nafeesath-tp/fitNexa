import React, { forwardRef } from 'react';
import FormError from './FormError';
import './ui.css';

const RadioGroup = forwardRef(({ label, error, options = [], name, onChange, value, className = '', ...props }, ref) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
        {options.map((opt) => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.95rem' }}>
            <input
              type="radio"
              ref={ref}
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={onChange}
              style={{ marginRight: '0.5rem', cursor: 'pointer' }}
              {...props}
            />
            {opt.label}
          </label>
        ))}
      </div>
      <FormError message={error} />
    </div>
  );
});

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;
