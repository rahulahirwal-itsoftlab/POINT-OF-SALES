"use client";

import { useEffect, useState } from "react";
import { superAdminApi } from "@/lib/api/super-admin.api";
import { formatCurrency } from "@/lib/formatters/currency";

type RevenueData = {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
};

export function RevenueOverview() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminApi.getRevenueOverview()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500">Monthly Revenue (MRR)</h3>
        <div className="mt-2 text-2xl font-bold">{formatCurrency(data.monthlyRevenue)}</div>
        <p className="text-xs text-gray-400 mt-1">This month</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500">Yearly Revenue (ARR)</h3>
        <div className="mt-2 text-2xl font-bold">{formatCurrency(data.yearlyRevenue)}</div>
        <p className="text-xs text-gray-400 mt-1">This year</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500">All-time Revenue</h3>
        <div className="mt-2 text-2xl font-bold text-blue-600">{formatCurrency(data.totalRevenue)}</div>
        <p className="text-xs text-gray-400 mt-1">Total platform earnings</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500">Transactions</h3>
        <div className="mt-2 text-2xl font-bold">{data.successfulTransactions}</div>
        <p className="text-xs text-gray-400 mt-1">
          {data.pendingTransactions} pending, {data.failedTransactions} failed
        </p>
      </div>
    </div>
  );
}
