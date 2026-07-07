import React from 'react';
import { cn } from '../../utils/cn';

export const Container = ({ children, className, ...props }) => (
  <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props}>
    {children}
  </div>
);

export const PageHeader = ({ title, description, children, className }) => (
  <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between mb-8", className)}>
    <div className="flex-1 min-w-0">
      <h1 className="text-2xl font-bold leading-7 text-gray-100 sm:truncate sm:text-3xl sm:tracking-tight">
        {title}
      </h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    {children && <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">{children}</div>}
  </div>
);

export const SectionTitle = ({ title, description, className }) => (
  <div className={cn("mb-6", className)}>
    <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
    {description && <p className="mt-1 text-sm text-muted">{description}</p>}
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border/20 bg-surface/50", className)}>
    {Icon && <Icon className="mx-auto h-12 w-12 text-muted mb-4" />}
    <h3 className="text-lg font-medium text-gray-100">{title}</h3>
    {description && <p className="mt-2 text-sm text-muted max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);
