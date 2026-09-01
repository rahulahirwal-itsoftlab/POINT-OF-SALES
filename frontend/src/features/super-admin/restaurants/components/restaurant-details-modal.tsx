"use client";

import { format } from "date-fns";
import { Building2, ShieldCheck, CreditCard, Key, Users, Clock, Mail, Phone } from "lucide-react";
import { CommonModal } from "@/components/common/modal";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ErrorState } from "@/components/common/error-state";
import { StatusBadge } from "@/components/common/status-badge";
import { RestaurantBranding } from "@/components/common/restaurant-branding";
import { DetailSection, DetailField } from "@/components/common/detail-overview-components";
import { useRestaurantDetail } from "../hooks/use-restaurants";
import { formatCurrency } from "@/lib/formatters/currency";

type Props = {
  restaurantId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

type RestaurantDetailPayload = {
  restaurant: {
    id: string;
    publicId: string;
    name: string;
    logo?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    taxNumber?: string | null;
    currency?: string | null;
    timezone?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  organization?: {
    id: string;
    publicId: string;
    name: string;
    status: string;
    createdAt: string;
  } | null;
  owner?: {
    name: string;
    email: string;
    phone?: string | null;
    role?: string;
    status: string;
    lastLoginAt?: string | null;
  } | null;
  currentSubscription?: {
    subscription: {
      id: string;
      billingCycle: string;
      price: string | number;
      baseAmount?: string | number | null;
      gstPercentage?: string | number | null;
      finalAmount?: string | number | null;
      status: string;
      paymentStatus: string;
      startDate: string;
      endDate: string;
      renewalDate?: string | null;
      waiterLimitSnapshot?: number | null;
      receptionistLimitSnapshot?: number | null;
      kitchenLimitSnapshot?: number | null;
    };
    plan: {
      name: string;
      code?: string;
      planType?: string;
    };
  } | null;
  currentLicense?: {
    licenseKey: string;
    status: string;
    issuedAt: string;
    expiresAt: string;
  } | null;
  recentAuditActivity?: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
  }>;
};

export function RestaurantDetailsModal({ restaurantId, isOpen, onClose }: Props) {
  const { data, isLoading, isError, refetch } = useRestaurantDetail(restaurantId ?? undefined);

  if (!isOpen) return null;

  const detail = data?.data as RestaurantDetailPayload | undefined;
  const restaurant = detail?.restaurant;
  const org = detail?.organization;
  const owner = detail?.owner;
  const sub = detail?.currentSubscription?.subscription;
  const plan = detail?.currentSubscription?.plan;
  const license = detail?.currentLicense;

  const isExpired = license ? new Date(license.expiresAt) < new Date() : false;
  const daysLeft = license ? Math.ceil((new Date(license.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const currency = restaurant?.currency || "INR";

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Restaurant Full Overview"
      description="Medium-sized centered overview panel."
      confirmText="Close"
      onConfirm={onClose}
      size="2xl"
    >
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-5 py-1">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError || !detail ? (
          <ErrorState message="Unable to load restaurant details." onRetry={() => refetch()} />
        ) : (
          <>
            {/* Restaurant Identity Header */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <RestaurantBranding restaurant={{ name: restaurant?.name, logo: restaurant?.logo }} size="lg" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{restaurant?.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      {restaurant?.email && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {restaurant.email}
                        </span>
                      )}
                      {restaurant?.phone && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {restaurant.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={restaurant?.status ?? "INACTIVE"} />
                  <span className="text-[11px] font-mono text-slate-500">ID: {restaurant?.publicId}</span>
                </div>
              </div>
            </div>

            {/* RESTAURANT INFORMATION */}
            <DetailSection title="Restaurant Information" icon={<Building2 className="h-4 w-4" />} columns={2}>
              <DetailField label="Restaurant Name" value={restaurant?.name} />
              <DetailField label="Business Email" value={restaurant?.email} />
              <DetailField label="Business Phone" value={restaurant?.phone} />
              <DetailField label="Tax / GST Number" value={restaurant?.taxNumber} />
              <DetailField label="Address" value={restaurant?.address} />
              <DetailField label="City" value={restaurant?.city} />
              <DetailField label="State" value={restaurant?.state} />
              <DetailField label="Country" value={restaurant?.country} />
              <DetailField label="Postal Code" value={restaurant?.postalCode} />
              <DetailField label="Currency" value={currency} />
              <DetailField label="Timezone" value={restaurant?.timezone ?? "Asia/Kolkata"} />
            </DetailSection>

            {/* OWNER / ADMIN DETAILS */}
            <DetailSection title="Owner / Admin Details" icon={<ShieldCheck className="h-4 w-4" />} columns={2}>
              <DetailField label="Owner Name" value={owner?.name} />
              <DetailField label="Admin Email" value={owner?.email} />
              <DetailField label="Admin Phone" value={owner?.phone} />
              <DetailField label="Role" value={owner?.role ?? "RESTAURANT_ADMIN"} />
              <DetailField label="Account Status" statusBadge={owner?.status} />
              <DetailField label="Last Active Login" value={owner?.lastLoginAt ? format(new Date(owner.lastLoginAt), "MMM d, yyyy h:mm a") : "Never"} />
            </DetailSection>

            {/* ORGANIZATION DETAILS */}
            <DetailSection title="Organization Details" icon={<Building2 className="h-4 w-4" />} columns={2}>
              <DetailField label="Organization Name" value={org?.name ?? restaurant?.name} />
              <DetailField label="Organization ID" value={org?.publicId ?? org?.id} isMono />
              <DetailField label="Organization Status" statusBadge={org?.status} />
              <DetailField label="Created Date" value={org?.createdAt ? format(new Date(org.createdAt), "MMM d, yyyy") : "-"} />
            </DetailSection>

            {/* SUBSCRIPTION DETAILS */}
            <DetailSection title="Subscription Details" icon={<CreditCard className="h-4 w-4" />} columns={2}>
              <DetailField label="Plan Name" value={plan?.name} />
              <DetailField label="Plan Type" value={plan?.planType ?? "COMMON"} />
              <DetailField label="Billing Cycle" value={sub?.billingCycle} />
              <DetailField label="Subscription Status" statusBadge={sub?.status} />
              <DetailField label="Start Date" value={sub?.startDate ? format(new Date(sub.startDate), "MMM d, yyyy") : "-"} />
              <DetailField label="Expiry Date" value={sub?.endDate ? format(new Date(sub.endDate), "MMM d, yyyy") : "-"} />
              <DetailField label="Base Amount" value={sub?.baseAmount != null ? formatCurrency(Number(sub.baseAmount), currency) : formatCurrency(Number(sub?.price ?? 0), currency)} />
              <DetailField label="GST Percentage" value={sub?.gstPercentage != null ? `${sub.gstPercentage}%` : "0%"} />
              <DetailField label="Final Amount" value={sub?.finalAmount != null ? formatCurrency(Number(sub.finalAmount), currency) : formatCurrency(Number(sub?.price ?? 0), currency)} />
            </DetailSection>

            {/* STAFF LIMITS */}
            <DetailSection title="Staff Limits" icon={<Users className="h-4 w-4" />} columns={2}>
              <DetailField label="Waiter Limit" value={sub?.waiterLimitSnapshot ?? "Unlimited"} />
              <DetailField label="Receptionist Limit" value={sub?.receptionistLimitSnapshot ?? "Unlimited"} />
              <DetailField label="Kitchen Staff Limit" value={sub?.kitchenLimitSnapshot ?? "Unlimited"} />
            </DetailSection>

            {/* LICENSE DETAILS */}
            <DetailSection title="License Details" icon={<Key className="h-4 w-4" />} columns={2}>
              <DetailField label="License Number" value={license?.licenseKey} isMono />
              <DetailField label="License Status" statusBadge={license?.status} />
              <DetailField label="License Type" value={plan?.planType ?? "COMMON"} />
              <DetailField label="Start Date" value={license?.issuedAt ? format(new Date(license.issuedAt), "MMM d, yyyy") : "-"} />
              <DetailField label="Expiry Date" value={license?.expiresAt ? format(new Date(license.expiresAt), "MMM d, yyyy") : "-"} />
              <DetailField
                label="Remaining Validity"
                value={
                  license ? (
                    <span className={`font-bold ${isExpired ? "text-red-600" : daysLeft <= 15 ? "text-amber-600" : "text-emerald-600"}`}>
                      {isExpired ? "Expired" : `${daysLeft} days remaining`}
                    </span>
                  ) : "-"
                }
              />
            </DetailSection>

            {/* SYSTEM INFORMATION */}
            <DetailSection title="System Information" icon={<Clock className="h-4 w-4" />} columns={2}>
              <DetailField label="Created At" value={restaurant?.createdAt ? format(new Date(restaurant.createdAt), "MMM d, yyyy h:mm a") : "-"} />
              <DetailField label="Updated At" value={restaurant?.updatedAt ? format(new Date(restaurant.updatedAt), "MMM d, yyyy h:mm a") : "-"} />
            </DetailSection>

            {/* Recent Audit Log */}
            {detail.recentAuditActivity && detail.recentAuditActivity.length > 0 ? (
              <DetailSection title="Recent Audit Activity" icon={<Clock className="h-4 w-4" />} columns={1}>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {detail.recentAuditActivity.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{log.action}</span>
                        <span className="ml-2 text-slate-500">({log.entityType})</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  ))}
                </div>
              </DetailSection>
            ) : null}
          </>
        )}
      </div>
    </CommonModal>
  );
}
