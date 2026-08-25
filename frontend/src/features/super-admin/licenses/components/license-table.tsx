"use client";

import { StatusBadge } from "@/components/common/status-badge";
import type { LicenseListItem } from "../api/license-api";

interface Props {
  rows: LicenseListItem[];
}

export function LicenseTable({ rows }: Props) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
        <p className="text-sm font-medium text-slate-500">No licenses found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">License Key</th>
            <th className="px-4 py-3 text-left font-semibold">Tenant</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Valid From</th>
            <th className="px-4 py-3 text-left font-semibold">Valid To</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((item) => {
            const isExpired = new Date(item.license.expiresAt) < new Date();
            const daysLeft = Math.ceil((new Date(item.license.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <tr key={item.license.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="font-mono font-medium text-slate-900">{item.license.licenseKey}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{item.restaurant.name}</div>
                  <div className="text-[10px] text-slate-500">{item.plan.name}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.license.status} />
                  {item.license.status === "ACTIVE" && !isExpired && daysLeft <= 15 && (
                    <div className="mt-1 text-[10px] font-medium text-amber-600">
                      Expires in {daysLeft} days
                    </div>
                  )}
                  {isExpired && item.license.status === "ACTIVE" && (
                    <div className="mt-1 text-[10px] font-medium text-rose-600">
                      Expired
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(item.license.issuedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${isExpired ? "text-rose-600" : "text-emerald-600"}`}>
                    {new Date(item.license.expiresAt).toLocaleDateString()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
