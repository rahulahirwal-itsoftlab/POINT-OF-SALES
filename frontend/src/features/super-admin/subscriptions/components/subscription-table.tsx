"use client";

import { StatusBadge } from "@/components/common/status-badge";
import type { SubscriptionListItem } from "../api/subscription-api";

interface Props {
  rows: SubscriptionListItem[];
}

export function SubscriptionTable({ rows }: Props) {
  const formatCurrency = (amount: string | number, currency: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(Number(amount));
  };

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
        <p className="text-sm font-medium text-slate-500">No subscriptions found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Tenant</th>
            <th className="px-4 py-3 text-left font-semibold">Plan</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Amount / Cycle</th>
            <th className="px-4 py-3 text-left font-semibold">Dates</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((item) => (
            <tr key={item.subscription.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{item.restaurant.name}</div>
                <div className="font-mono text-[10px] text-slate-400">ID: {item.restaurant.publicId}</div>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-indigo-700">{item.plan.name}</span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.subscription.status} />
                <div className="mt-1">
                  <StatusBadge status={item.subscription.paymentStatus} />
                </div>
              </td>
              <td className="px-4 py-3 font-medium text-slate-800">
                {formatCurrency(item.subscription.price, item.subscription.currency)}
                <span className="block text-[10px] text-slate-500 font-normal">
                  per {item.subscription.billingCycle.toLowerCase()}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                <div className="grid grid-cols-[60px_1fr] gap-x-2">
                  <span className="text-slate-400">Start:</span>
                  <span>{new Date(item.subscription.startDate).toLocaleDateString()}</span>
                  <span className="text-slate-400">End:</span>
                  <span>{new Date(item.subscription.endDate).toLocaleDateString()}</span>
                  <span className="text-slate-400">Renew:</span>
                  <span className="font-medium text-amber-600">{new Date(item.subscription.renewalDate).toLocaleDateString()}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
