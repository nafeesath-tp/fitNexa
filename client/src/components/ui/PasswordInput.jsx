import React, { forwardRef, useState } from 'react';
import FormError from './FormError';
import './ui.css';

const PasswordInput = forwardRef(({ label, error, className = '', ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={`input-field ${error ? 'error' : ''} ${className}`}
          style={{ paddingRight: '2.5rem' }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      <FormError message={error} />
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
