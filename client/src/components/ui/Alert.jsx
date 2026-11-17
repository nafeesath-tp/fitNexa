import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable inline Alert box component.
 * Usage:
 *   <Alert variant="danger" title="Error">Failed to process request.</Alert>
 */
export const Alert = ({
  variant = 'info',
  title,
  children,
  onClose,
  className,
  icon,
}) => {
  const variantStyles = {
    info: {
      container: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
      icon: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
      titleColor: 'text-blue-200',
    },
    success: {
      container: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
      titleColor: 'text-emerald-200',
    },
    warning: {
      container: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
      titleColor: 'text-amber-200',
    },
    danger: {
      container: 'bg-red-500/10 border-red-500/20 text-red-300',
      icon: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
      titleColor: 'text-red-200',
    },
  };

  const style = variantStyles[variant] || variantStyles.info;

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-xl border transition-all text-sm',
        style.container,
        className
      )}
    >
      <div className="mt-0.5">{icon || style.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h5 className={cn('font-semibold mb-1 text-sm', style.titleColor)}>{title}</h5>}
        <div className="leading-relaxed break-words">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/5 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;

