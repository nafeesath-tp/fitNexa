import React from 'react';

const PageHeader = ({ title, description, actions, children }) => {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
            {title}
          </h1>
          {description && (
            <p style={{ color: '#6b7280', margin: 0 }}>
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {actions}
          </div>
        )}
      </div>
      
      {children && (
        <div style={{ marginTop: '1.5rem' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
