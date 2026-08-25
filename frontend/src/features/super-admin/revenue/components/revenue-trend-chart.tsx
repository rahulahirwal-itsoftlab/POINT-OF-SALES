"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMonthlyRevenue, useYearlyRevenue } from "../hooks/use-revenue";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ErrorState } from "@/components/common/error-state";

export function RevenueTrendChart() {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const { data: monthlyData, isLoading: monthlyLoading, isError: monthlyError } = useMonthlyRevenue();
  const { data: yearlyData, isLoading: yearlyLoading, isError: yearlyError } = useYearlyRevenue();

  const chartData = useMemo(() => {
    if (view === "monthly" && monthlyData?.data) {
      // Recharts plots left to right, but our API returns desc order (newest first).
      return [...monthlyData.data].reverse();
    }
    if (view === "yearly" && yearlyData?.data) {
      return [...yearlyData.data].reverse();
    }
    return [];
  }, [view, monthlyData, yearlyData]);

  const isLoading = view === "monthly" ? monthlyLoading : yearlyLoading;
  const isError = view === "monthly" ? monthlyError : yearlyError;

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message={`Unable to load ${view} revenue data.`} />;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact", // e.g. 1.2M, 50K
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Revenue Trend</h3>
          <p className="text-sm text-slate-500">SaaS subscription revenue over time.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("monthly")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "monthly" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setView("yearly")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "yearly" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-slate-500">
          No revenue data available for this period.
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="period" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={formatCurrency} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                width={80}
              />
              <Tooltip 
                formatter={(value: unknown) => [
                  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value ?? 0)),
                  "Revenue"
                ]}
                labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
