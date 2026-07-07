import React from 'react';
import { cn } from '../../utils/cn';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface border border-border/5", className)}
      {...props}
    />
  );
};

export default Skeleton;
