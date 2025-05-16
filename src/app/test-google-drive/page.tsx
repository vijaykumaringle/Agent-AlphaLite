'use client';

import { useState } from 'react';

export default function TestGoogleDrive() {
  const [data, setData] = useState<{
    stockData: any[];
    ordersData: any[];
    message: string;
    logs?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google-drive');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      
      // Add logs from the API response
      const logs = [];
      logs.push(`Stock response status: ${response.status}`);
      logs.push(`Stock data length: ${result.stockData?.length}`);
      logs.push(`Orders data length: ${result.ordersData?.length}`);
      
      setData({
        ...result,
        logs
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Google Drive Test</h1>
      <div className="mb-4">
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Fetching...' : 'Fetch Data'}
        </button>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {loading && <div>Loading...</div>}
      {data && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">Data Fetched</h2>
          <div className="space-y-4">
            {data.logs?.map((log, index) => (
              <div key={index} className="text-sm text-gray-600">
                {log}
              </div>
            ))}
            <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
