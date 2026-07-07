import React from 'react';

const StatCard = ({ title, value, icon, color = '#2563eb' }) => {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
          {title}
        </p>
        <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          {value}
        </h3>
      </div>
      
      {icon && (
        <div style={{
          backgroundColor: `${color}20`, // Add 20 for 12% opacity roughly in hex
          color: color,
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem'
        }}>
          {icon}
        </div>
      )}
    </div>
  );
};

export default StatCard;
