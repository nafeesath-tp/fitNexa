import React from 'react';

const EmptyState = ({ message = "No data available", icon = "📁" }) => {
  return (
    <div style={{
      padding: '3rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      borderRadius: '0.5rem',
      border: '1px dashed #d1d5db',
      color: '#6b7280',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>
        {icon}
      </div>
      <p style={{ fontSize: '1rem', fontWeight: '500' }}>{message}</p>
    </div>
  );
};

export default EmptyState;
