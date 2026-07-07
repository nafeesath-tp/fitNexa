import React from 'react';

const SearchBar = ({ placeholder = "Search...", value, onChange, style = {} }) => {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px', ...style }}>
      <div style={{
        position: 'absolute',
        left: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#9ca3af',
        pointerEvents: 'none'
      }}>
        🔍
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '0.625rem 1rem 0.625rem 2.5rem',
          borderRadius: '0.375rem',
          border: '1px solid #d1d5db',
          fontSize: '0.875rem',
          color: '#111827',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
};

export default SearchBar;
