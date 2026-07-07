import React from 'react';

const Avatar = ({ image, name = '', size = 'md', style = {} }) => {
  // Sizes mapping for consistency
  const sizeMap = {
    sm: '32px',
    md: '48px',
    lg: '64px',
    xl: '96px'
  };

  const pxSize = sizeMap[size] || sizeMap.md;
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  const containerStyle = {
    width: pxSize,
    height: pxSize,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb', // gray-200
    color: '#4b5563', // gray-600
    fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.5rem' : size === 'xl' ? '2rem' : '1.25rem',
    fontWeight: '600',
    overflow: 'hidden',
    flexShrink: 0,
    ...style
  };

  if (image && typeof image === 'string') {
    return (
      <div style={containerStyle}>
        <img 
          src={image} 
          alt={name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>
    );
  }

  // Fallback to initial
  return (
    <div style={containerStyle}>
      {initial}
    </div>
  );
};

export default Avatar;
