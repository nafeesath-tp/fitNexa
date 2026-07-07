import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const Loader = ({ className, size = 24 }) => {
  return (
    <Loader2 
      size={size} 
      className={cn("animate-spin text-primary", className)} 
    />
  );
};

export default Loader;
