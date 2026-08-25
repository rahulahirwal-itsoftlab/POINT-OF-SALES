"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/page-header";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ErrorState } from "@/components/common/error-state";
import { StatusBadge } from "@/components/common/status-badge";
import { superAdminApi } from "@/lib/api/super-admin.api";

type SuperAdminProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  role: "SUPER_ADMIN";
  lastLoginAt?: string | null;
  createdAt: string;
};

export function ProfileCard() {
  const { data, isLoading, isError } = useQuery<SuperAdminProfile>({
    queryKey: ["super-admin", "profile"],
    queryFn: superAdminApi.getProfile,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data) return <ErrorState message="Unable to load Super Admin profile." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile & Session" description="Current authenticated Super Admin identity from the backend." />
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{data.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{data.email}</p>
          </div>
          <StatusBadge status={data.status} />
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase text-slate-500">Role</dt>
            <dd className="mt-1 text-sm font-semibold">{data.role}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase text-slate-500">Phone</dt>
            <dd className="mt-1 text-sm font-semibold">{data.phone || "-"}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase text-slate-500">Last Login</dt>
            <dd className="mt-1 text-sm font-semibold">{data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString() : "-"}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase text-slate-500">Created</dt>
            <dd className="mt-1 text-sm font-semibold">{new Date(data.createdAt).toLocaleDateString()}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-500">Public ID</dt>
            <dd className="mt-1 break-all font-mono text-sm">{data.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
