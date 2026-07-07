import React from 'react';

const FormError = ({ message }) => {
  if (!message) return null;
  return (
    <span style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
      {message}
    </span>
  );
};

export default FormError;
