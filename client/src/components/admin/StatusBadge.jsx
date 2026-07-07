import React from 'react';

const StatusBadge = ({ status }) => {
  let bgColor, textColor;

  switch (status?.toUpperCase()) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'TRUE':
      bgColor = '#dcfce7'; // green-100
      textColor = '#166534'; // green-800
      break;
    case 'PENDING':
      bgColor = '#fef3c7'; // yellow-100
      textColor = '#92400e'; // yellow-800
      break;
    case 'REJECTED':
    case 'INACTIVE':
    case 'FALSE':
      bgColor = '#fee2e2'; // red-100
      textColor = '#991b1b'; // red-800
      break;
    default:
      bgColor = '#f3f4f6'; // gray-100
      textColor = '#374151'; // gray-700
      break;
  }

  return (
    <span style={{
      backgroundColor: bgColor,
      color: textColor,
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      display: 'inline-block'
    }}>
      {status === 'TRUE' ? 'Active' : status === 'FALSE' ? 'Inactive' : status}
    </span>
  );
};

export default StatusBadge;
