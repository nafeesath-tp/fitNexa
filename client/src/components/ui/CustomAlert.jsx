import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, CheckCircle2, Trash2, X, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';

// Global subscriber mechanism for programmatic triggers
let alertHandler = null;

/**
 * Triggers a custom confirmation dialog.
 * @returns {Promise<boolean>} Resolves to true if user confirms, false otherwise.
 */
export const confirmDialog = (options) => {
  if (typeof options === 'string') {
    options = { message: options };
  }
  return new Promise((resolve) => {
    if (alertHandler) {
      alertHandler({
        type: 'confirm',
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'danger',
        icon: options.icon || null,
        resolve,
      });
    } else {
      // Fallback if container is not mounted
      const ok = window.confirm(options.message || 'Are you sure?');
      resolve(ok);
    }
  });
};

/**
 * Triggers a custom alert dialog.
 * @returns {Promise<void>} Resolves when dismissed.
 */
export const alertDialog = (options) => {
  if (typeof options === 'string') {
    options = { message: options };
  }
  return new Promise((resolve) => {
    if (alertHandler) {
      alertHandler({
        type: 'alert',
        title: options.title || 'Notice',
        message: options.message || '',
        confirmText: options.confirmText || options.buttonText || 'OK',
        variant: options.variant || 'info',
        icon: options.icon || null,
        resolve: () => resolve(),
      });
    } else {
      window.alert(options.message || '');
      resolve();
    }
  });
};

// Global safety bridge: intercept native window.alert to use custom alert box
if (typeof window !== 'undefined') {
  window.customConfirm = confirmDialog;
  window.customAlert = alertDialog;

  const originalAlert = window.alert;
  window.alert = (msg) => {
    if (alertHandler) {
      alertDialog({ title: 'Alert', message: String(msg || '') });
    } else if (originalAlert) {
      originalAlert(msg);
    }
  };
}

/**
 * Container component that must be rendered at the root of the app (e.g. in App.jsx).
 */
export const CustomAlertContainer = () => {
  const [dialogState, setDialogState] = useState(null);

  useEffect(() => {
    alertHandler = (state) => setDialogState(state);
    return () => {
      alertHandler = null;
    };
  }, []);

  const handleClose = useCallback((result) => {
    if (dialogState?.resolve) {
      dialogState.resolve(result);
    }
    setDialogState(null);
  }, [dialogState]);

  useEffect(() => {
    if (!dialogState) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState, handleClose]);

  if (!dialogState || typeof document === 'undefined') return null;

  const {
    type = 'confirm',
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
  } = dialogState;

  const getVariantDetails = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-red-400" />,
          iconBg: 'bg-red-500/10 border-red-500/20 text-red-400',
          cardBorder: 'border-red-500/20 shadow-red-500/5',
          confirmButtonVariant: 'danger',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          cardBorder: 'border-amber-500/20 shadow-amber-500/5',
          confirmButtonVariant: 'primary',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
          iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          cardBorder: 'border-emerald-500/20 shadow-emerald-500/5',
          confirmButtonVariant: 'primary',
        };
      case 'primary':
        return {
          icon: <HelpCircle className="w-6 h-6 text-primary" />,
          iconBg: 'bg-primary/10 border-primary/20 text-primary',
          cardBorder: 'border-primary/20 shadow-primary/5',
          confirmButtonVariant: 'primary',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-400" />,
          iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          cardBorder: 'border-blue-500/20 shadow-blue-500/5',
          confirmButtonVariant: 'primary',
        };
    }
  };

  const details = getVariantDetails();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
        onClick={() => handleClose(false)}
        aria-hidden="true"
      />

      {/* Dialog Card */}
      <div 
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl bg-gray-900 border shadow-2xl p-6 overflow-hidden",
          "animate-in fade-in zoom-in-95 duration-200",
          details.cardBorder
        )}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={() => handleClose(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon Badge */}
          <div className={cn("p-3 rounded-xl border flex-shrink-0 flex items-center justify-center", details.iconBg)}>
            {dialogState.icon || details.icon}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-lg font-bold text-white mb-1.5 leading-snug">
              {title}
            </h3>
            <div className="text-sm text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
              {message}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          {type === 'confirm' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleClose(false)}
              className="text-gray-400 hover:text-white hover:bg-white/5 px-4"
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            variant={details.confirmButtonVariant}
            size="sm"
            onClick={() => handleClose(true)}
            className="px-5 shadow-lg"
            autoFocus
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CustomAlertContainer;

