'use client';

import { useState } from 'react';
import { Download, ChevronUp, ChevronDown } from 'lucide-react';

interface DataTableProps {
  data: Record<string, any>[];
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
  }>;
  title: string;
  exportFileName?: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export default function DataTable({ data, columns, title, exportFileName }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Helper functions
  const filteredData = () => {
    return data.filter((item: Record<string, any>) => 
      columns.some((col: { key: string }) => 
        item[col.key]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const sortedData = () => {
    const filtered = filteredData();
    if (!sortConfig) return filtered;

    return [...filtered].sort((a: Record<string, any>, b: Record<string, any>) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  };

  // Pagination
  const totalPages = Math.ceil(sortedData().length / itemsPerPage);
  const currentData = sortedData().slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleSort = (key: string) => {
    if (sortConfig?.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = columns.map((col: { label: string }) => col.label);
    const csvData = [
      headers,
      ...sortedData().map((item: Record<string, any>) => 
        columns.map((col: { key: string }) => item[col.key])
      )
    ];

    const csvContent = csvData.map((row: any[]) => 
      row.map((cell: any) => 
        typeof cell === 'string' ? 
          cell.includes(',') ? `"${cell}"` : cell 
          : cell
      ).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${exportFileName || 'data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {exportFileName && (
            <button
              onClick={exportToCSV}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((col: { key: string; label: string; sortable?: boolean; width?: string }) => (
                <th
                  key={col.key}
                  className={`px-4 py-2 text-left ${col.width || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center">
                    {col.label}
                    {col.sortable && (
                      <span className="ml-2">
                        {sortConfig?.key === col.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <span className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((item: Record<string, any>, index: number) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((col: { key: string; width?: string }) => (
                  <td key={col.key} className={`px-4 py-2 ${col.width || ''}`}>
                    {item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => handlePageChange(1)}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            First
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}
