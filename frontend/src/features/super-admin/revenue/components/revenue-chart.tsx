"use client";

import { useEffect, useState } from "react";
import { superAdminApi } from "@/lib/api/super-admin.api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/formatters/currency";

type ChartItem = {
  period: string;
  revenue: number;
  transactions: number;
};

export function RevenueChart() {
  const [data, setData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminApi.getMonthlyRevenue()
      .then((res) => {
        // Reverse to show chronological order
        setData(res.reverse());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading chart...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm h-[400px] flex items-center justify-center">
        <div className="text-gray-400">No revenue data available.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold leading-none tracking-tight mb-6">Revenue Trend</h3>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(Number(value))}
            />
            <Tooltip
              formatter={(value) => [
                formatCurrency(Number(value ?? 0)),
                "Revenue",
              ]}
              labelStyle={{ color: "black" }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
