import React from 'react';
import Loader from './Loader';
import { cn } from '../../utils/cn';

const PageLoader = ({ className }) => {
  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-background", className)}>
      <Loader size={40} />
    </div>
  );
};

export default PageLoader;
