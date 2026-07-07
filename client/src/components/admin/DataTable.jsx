import React from 'react';
import LoadingTable from './LoadingTable';
import EmptyState from './EmptyState';

const DataTable = ({ 
  columns = [], 
  data = [], 
  loading = false, 
  emptyMessage = "No records found",
  onRowClick = null
}) => {
  if (loading) {
    return <LoadingTable cols={columns.length} rows={5} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      borderRadius: '0.5rem', 
      border: '1px solid #e5e7eb', 
      overflowX: 'auto',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <tr>
            {columns.map((col, index) => (
              <th 
                key={index} 
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '0.75rem', 
                  fontWeight: '600', 
                  color: '#6b7280', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ backgroundColor: '#ffffff', divideY: '1px solid #e5e7eb' }}>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              onClick={() => onRowClick && onRowClick(row)}
              style={{ 
                borderBottom: rowIndex === data.length - 1 ? 'none' : '1px solid #e5e7eb',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => onRowClick && (e.currentTarget.style.backgroundColor = '#f9fafb')}
              onMouseLeave={(e) => onRowClick && (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              {columns.map((col, colIndex) => (
                <td 
                  key={colIndex} 
                  style={{ 
                    padding: '1rem 1.5rem', 
                    fontSize: '0.875rem', 
                    color: '#111827',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {/* If column has a custom render function, use it; otherwise access property by accessor */}
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
