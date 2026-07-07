import React from 'react';
import Button from '../ui/Button';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e5e7eb'
    }}>
      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
        Page <span style={{ fontWeight: '600', color: '#111827' }}>{currentPage}</span> of <span style={{ fontWeight: '600', color: '#111827' }}>{totalPages}</span>
      </span>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button 
          variant="secondary" 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '0.5rem 1rem' }}
        >
          Previous
        </Button>
        <Button 
          variant="secondary" 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '0.5rem 1rem' }}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
