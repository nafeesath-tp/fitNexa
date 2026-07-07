import React from 'react';

const LoadingTable = ({ rows = 5, cols = 4 }) => {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#f9fafb' }}>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                <div style={{ height: '1rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', width: '70%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} style={{ borderBottom: '1px solid #e5e7eb' }}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} style={{ padding: '1rem' }}>
                  <div style={{ height: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.25rem', width: colIndex === 0 ? '50%' : '80%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingTable;
