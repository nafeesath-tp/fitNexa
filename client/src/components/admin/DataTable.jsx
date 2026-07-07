import React from 'react';
import Skeleton from '../ui/Skeleton';
import { EmptyState } from '../ui/LayoutComponents';
import { SearchX } from 'lucide-react';
import { cn } from '../../utils/cn';

const DataTable = ({ 
  columns = [], 
  data = [], 
  loading = false, 
  emptyMessage = "No records found",
  onRowClick = null
}) => {
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border/10 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/10 bg-background/50">
              {columns.map((col, index) => (
                <th key={index} className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <Skeleton className="h-5 w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border/10 p-8">
        <EmptyState 
          icon={SearchX} 
          title="No Data" 
          description={emptyMessage} 
          className="bg-transparent border-none shadow-none"
        />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border/10 overflow-x-auto shadow-lg">
      <table className="w-full text-left border-collapse">
        <thead className="bg-background/50 border-b border-border/10">
          <tr>
            {columns.map((col, index) => (
              <th 
                key={index} 
                className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/10">
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              onClick={() => onRowClick && onRowClick(row)}
              className={cn(
                "transition-colors duration-200",
                onRowClick ? "cursor-pointer hover:bg-background/30" : ""
              )}
            >
              {columns.map((col, colIndex) => (
                <td 
                  key={colIndex} 
                  className="px-6 py-4 text-sm text-gray-200 whitespace-nowrap"
                >
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
