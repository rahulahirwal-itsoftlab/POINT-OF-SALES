"use client";

import { Bell, Building2, UserCircle, Receipt, ShieldCheck, AlertTriangle } from "lucide-react";
import { AnalyticsPanel, DonutAnalytics, MetricStrip, type ChartDatum } from "@/components/dashboard/analytics-widgets";
import { DashboardDateFilter } from "@/components/dashboard/dashboard-date-filter";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { PageHeader } from "@/components/common/page-header";
import { useDashboardDateFilter } from "@/hooks/use-dashboard-date-filter";
import { useSuperAdminDashboard } from "../hooks/use-super-admin-dashboard";

export function DashboardOverview() {
  const dateFilter = useDashboardDateFilter();
  const { data, isLoading, isFetching, isError, refetch } = useSuperAdminDashboard(dateFilter.apiParams);

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load Super Admin dashboard." onRetry={() => refetch()} />;

  const dashboard = data?.data;

  if (!dashboard) {
    return <ErrorState message="Dashboard data is missing." onRetry={() => refetch()} />;
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };
  const organizationRows: ChartDatum[] = [
    { status: "Active", value: dashboard.organizations.active },
    { status: "Inactive", value: dashboard.organizations.inactive },
    { status: "Blocked", value: dashboard.organizations.blocked },
  ];
  const subscriptionRows: ChartDatum[] = [
    { status: "Monthly", value: dashboard.subscriptions.monthly },
    { status: "Yearly", value: dashboard.subscriptions.yearly },
    { status: "Expired", value: dashboard.subscriptions.expired },
    { status: "Expiring Soon", value: dashboard.subscriptions.expiringSoon },
  ];
  const licenseRows: ChartDatum[] = [
    { status: "Active", value: dashboard.licenses.active },
    { status: "Expired", value: dashboard.licenses.expired },
    { status: "Expiring Soon", value: dashboard.licenses.expiringSoon },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Platform Dashboard" 
        description="Real-time analytics and management overview of the entire SaaS platform." 
        actions={<DashboardDateFilter value={dateFilter.filter} onChange={dateFilter.setFilter} onReset={dateFilter.resetFilter} isLoading={isFetching} />}
      />

      <MetricStrip items={[
        { label: "Selected Revenue", value: formatCurrency(dashboard.revenue.selected ?? dashboard.revenue.monthly), hint: dashboard.dateRange?.preset ?? "selected range", tone: "green" },
        { label: "Restaurants", value: dashboard.organizations.total, hint: `${dashboard.organizations.active} active`, tone: "blue" },
        { label: "Subscriptions", value: dashboard.subscriptions.active, hint: `${dashboard.subscriptions.expiringSoon} expiring soon`, tone: "amber" },
        { label: "Licenses", value: dashboard.licenses.active, hint: `${dashboard.licenses.expired} expired`, tone: dashboard.licenses.expired ? "red" : "green" },
      ]} />

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPanel title="Restaurant Health" subtitle="Active, inactive, and blocked restaurant distribution.">
          <DonutAnalytics data={organizationRows} nameKey="status" valueKey="value" centerLabel="Restaurants" centerValue={dashboard.organizations.total} emptyMessage="Restaurant distribution is not available." />
        </AnalyticsPanel>
        <AnalyticsPanel title="Plan Distribution" subtitle="Monthly, yearly, expired, and expiring subscriptions.">
          <DonutAnalytics data={subscriptionRows} nameKey="status" valueKey="value" centerLabel="Plans" centerValue={dashboard.subscriptions.active} emptyMessage="Subscription distribution is not available." />
        </AnalyticsPanel>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organizations Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Organizations</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-500">Total Organizations</h4>
                <Building2 className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl font-bold">{dashboard.organizations.total}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {dashboard.organizations.active} Active
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  {dashboard.organizations.inactive} Inactive
                </span>
                {dashboard.organizations.blocked > 0 ? (
                  <span className="flex items-center gap-1 text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    {dashboard.organizations.blocked} Blocked
                  </span>
                ) : null}
              </div>
            </div>
            
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-500">Restaurant Admins</h4>
                <UserCircle className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl font-bold">{dashboard.admins.total}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="text-emerald-600">{dashboard.admins.active} Active</span>
                {dashboard.admins.blocked > 0 && <span className="text-rose-600">{dashboard.admins.blocked} Blocked</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Licensing</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-500">Active Subscriptions</h4>
                <Receipt className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{dashboard.subscriptions.active}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span>{dashboard.subscriptions.monthly} Monthly</span>
                <span>{dashboard.subscriptions.yearly} Yearly</span>
              </div>
              {dashboard.subscriptions.expired > 0 && (
                <p className="mt-1 text-xs text-rose-500">
                  {dashboard.subscriptions.expired} Expired
                </p>
              )}
              {dashboard.subscriptions.expiringSoon > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  {dashboard.subscriptions.expiringSoon} Expiring Soon
                </p>
              )}
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-500">Active Licenses</h4>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{dashboard.licenses.active}</p>
              
              {(dashboard.licenses.expiringSoon > 0 || dashboard.licenses.expired > 0) && (
                <div className="mt-1 flex flex-col gap-1 text-xs">
                  {dashboard.licenses.expiringSoon > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      {dashboard.licenses.expiringSoon} Expiring Soon
                    </span>
                  )}
                  {dashboard.licenses.expired > 0 && (
                    <span className="flex items-center gap-1 text-rose-600">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      {dashboard.licenses.expired} Expired
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPanel title="Plan Distribution" subtitle="Monthly, yearly, expired, and expiring subscriptions.">
          <DonutAnalytics data={subscriptionRows} nameKey="status" valueKey="value" centerLabel="Plans" centerValue={dashboard.subscriptions.active} emptyMessage="Subscription distribution is not available." />
        </AnalyticsPanel>
        <AnalyticsPanel title="License Risk" subtitle="License health and expiration pressure.">
          <DonutAnalytics data={licenseRows} nameKey="status" valueKey="value" centerLabel="Licenses" centerValue={dashboard.licenses.active} emptyMessage="License distribution is not available." />
        </AnalyticsPanel>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Recent Notifications</h3>
          <Bell className="h-5 w-5 text-slate-400" />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {dashboard.notifications.unread} unread platform notification{dashboard.notifications.unread === 1 ? "" : "s"}.
        </p>
      </div>
    </div>
  );
}
