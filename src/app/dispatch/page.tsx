'use client';

import { useState, useEffect } from 'react';
import { fetchDataFromGoogleSheetTool } from '@/ai/tools/google-drive-tools';
import { generateDispatchPlan } from '@/ai/flows/generate-dispatch-plan';
import DataTable from '@/components/dispatch/DataTable';
import StockChart from '@/components/dispatch/StockChart';
import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface DispatchPlanData {
  summary: string;
  dispatchPlan: Array<{
    'SR NO': number;
    Date: string;
    Customer: string;
    Size: string;
    'Ordered Quantity': number;
    'Stock Before Allocation': number;
    'Dispatched Quantity': number;
    'Remaining Stock': number;
    'Order Status': string;
    Notes: string;
  }>;
  updatedStockSummary: Array<{
    SIZE: string;
    'Remaining Quantity': number;
  }>;
  zeroStockSizes: string[];
  pendingOrders: Array<{
    'SR NO': number;
    Customer: string;
    Size: string;
    'Pending Quantity': number;
    Reason: string;
  }>;
  recommendedActions: string;
}

export default function DispatchDashboard() {
  const [dispatchData, setDispatchData] = useState<DispatchPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAndProcessData = async () => {
    try {
      setRefreshing(true);
      // Fetch data from Google Sheet
      const response = await fetch('/api/google-drive');
      if (!response.ok) {
        throw new Error('Failed to fetch data from Google Drive');
      }
      const data = await response.json();

      // Generate dispatch plan
      const dispatchPlan = await generateDispatchPlan({
        stockData: data.stockData,
        pendingOrdersData: data.ordersData
      });

      setDispatchData(dispatchPlan);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching or processing data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAndProcessData();
  }, []);

  const handleRefresh = () => {
    fetchAndProcessData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <RefreshCw className="w-4 h-4 mr-2 inline" />
          Retry
        </button>
      </div>
    );
  }

  if (!dispatchData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dispatch Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Summary */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <p className="text-gray-600">{dispatchData.summary}</p>
      </div>

      {/* Stock Chart */}
      <StockChart stockData={dispatchData.updatedStockSummary} />

      {/* Dispatch Plan Table */}
      <DataTable
        title="Dispatch Plan"
        data={dispatchData.dispatchPlan}
        columns={[
          { key: 'SR NO', label: 'SR NO', sortable: true, width: 'w-16' },
          { key: 'Date', label: 'Date', sortable: true },
          { key: 'Customer', label: 'Customer', sortable: true },
          { key: 'Size', label: 'Size', sortable: true },
          { key: 'Ordered Quantity', label: 'Ordered Qty', sortable: true },
          { key: 'Stock Before Allocation', label: 'Stock Before', sortable: true },
          { key: 'Dispatched Quantity', label: 'Dispatched Qty', sortable: true },
          { key: 'Remaining Stock', label: 'Remaining Stock', sortable: true },
          { key: 'Order Status', label: 'Status', sortable: true },
          { key: 'Notes', label: 'Notes' }
        ]}
        exportFileName="dispatch-plan"
      />

      {/* Stock Summary Table */}
      <DataTable
        title="Stock Summary"
        data={dispatchData.updatedStockSummary}
        columns={[
          { key: 'SIZE', label: 'Size', sortable: true },
          { key: 'Remaining Quantity', label: 'Remaining Qty', sortable: true }
        ]}
        exportFileName="stock-summary"
      />

      {/* Zero Stock Sizes */}
      {dispatchData.zeroStockSizes.length > 0 && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sizes with Zero Stock</h2>
          <ul className="list-disc pl-5">
            {dispatchData.zeroStockSizes.map((size, index) => (
              <li key={index} className="text-red-500">
                <XCircle className="w-4 h-4 inline mr-1" />
                {size}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pending Orders Table */}
      {dispatchData.pendingOrders.length > 0 && (
        <DataTable
          title="Pending Orders"
          data={dispatchData.pendingOrders}
          columns={[
            { key: 'SR NO', label: 'SR NO', sortable: true, width: 'w-16' },
            { key: 'Customer', label: 'Customer', sortable: true },
            { key: 'Size', label: 'Size', sortable: true },
            { key: 'Pending Quantity', label: 'Pending Qty', sortable: true },
            { key: 'Reason', label: 'Reason' }
          ]}
          exportFileName="pending-orders"
        />
      )}

      {/* Recommended Actions */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recommended Actions</h2>
        <div className="space-y-4">
          {dispatchData.recommendedActions.split('\n').map((action, index) => (
            <div key={index} className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-1" />
              <p className="text-gray-600">{action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
