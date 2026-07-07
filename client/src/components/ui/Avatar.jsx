import React from 'react';
import { cn } from '../../utils/cn';

const Avatar = ({ image, name = '', size = 'md', className }) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-xl'
  };

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div 
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-gray-200 shadow-sm border border-border/10",
        sizes[size],
        className
      )}
    >
      {image && typeof image === 'string' ? (
        <img 
          src={image} 
          alt={name} 
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-semibold">{initial}</span>
      )}
    </div>
  );
};

export default Avatar;
