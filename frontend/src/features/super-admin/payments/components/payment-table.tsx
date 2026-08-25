"use client";

import { StatusBadge } from "@/components/common/status-badge";
import type { PaymentListItem } from "../types/payment.types";

interface Props {
  rows: PaymentListItem[];
}

export function PaymentTable({ rows }: Props) {
  const formatCurrency = (amount: string | number, currency: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(Number(amount));
  };

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
        <p className="text-sm font-medium text-slate-500">No payments found</p>
        <p className="mt-1 text-xs text-slate-400">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Payment ID</th>
            <th className="px-4 py-3 text-left font-semibold">Restaurant</th>
            <th className="px-4 py-3 text-left font-semibold">Amount</th>
            <th className="px-4 py-3 text-left font-semibold">Method</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((item) => (
            <tr key={item.payment.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">
                <div className="font-mono text-xs text-slate-600">{item.payment.id.slice(0, 8)}...</div>
                <div className="text-[10px] text-slate-400">{item.payment.transactionReference || "No Ref"}</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{item.restaurant.name}</div>
                {item.subscription && (
                  <div className="text-[10px] text-slate-500">
                    SaaS ({item.subscription.billingCycle})
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-semibold text-slate-900">
                {formatCurrency(item.payment.amount, item.payment.currency)}
              </td>
              <td className="px-4 py-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                  {item.payment.method}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.payment.status} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {new Date(item.payment.createdAt).toLocaleDateString()}
                <span className="block text-[10px] text-slate-400">
                  {new Date(item.payment.createdAt).toLocaleTimeString()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
