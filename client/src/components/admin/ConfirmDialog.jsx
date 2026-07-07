import React from 'react';
import Modal from './Modal';
import Button from '../ui/Button';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDestructive = true, isLoading = false }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: '1.5' }}>
        {message}
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <Button 
          variant="secondary" 
          onClick={onClose} 
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button 
          variant="primary" 
          onClick={onConfirm} 
          isLoading={isLoading}
          style={{ 
            backgroundColor: isDestructive ? '#ef4444' : undefined,
            borderColor: isDestructive ? '#ef4444' : undefined
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
