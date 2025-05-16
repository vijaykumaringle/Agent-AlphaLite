'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StockChartProps {
  stockData: Array<{
    SIZE: string;
    'Remaining Quantity': number;
    'Stock Before Allocation'?: number;
  }>;
}

export default function StockChart({ stockData }: StockChartProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const formattedData = stockData.map((item) => ({
    size: item.SIZE,
    remaining: item['Remaining Quantity'],
    before: item['Stock Before Allocation'] || 0
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 rounded shadow">
          <p className="text-sm">Size: {payload[0].payload.size}</p>
          <p className="text-sm">Stock Before: {payload[0].payload.before}</p>
          <p className="text-sm">Remaining: {payload[0].payload.remaining}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Stock Levels</h2>
      <div className="w-full h-[400px]">
        <ResponsiveContainer>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="size" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="remaining" fill="#82ca9d" name="Remaining" />
            {formattedData.some(item => item.before > 0) && (
              <Bar dataKey="before" fill="#8884d8" name="Stock Before" />
            )}
            <Bar dataKey="remaining" stackId="a" fill="#82ca9d" name="Remaining" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
