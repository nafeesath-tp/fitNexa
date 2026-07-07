import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, className }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl bg-card border border-border/10 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/10">
          <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 rounded-full p-0" 
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
