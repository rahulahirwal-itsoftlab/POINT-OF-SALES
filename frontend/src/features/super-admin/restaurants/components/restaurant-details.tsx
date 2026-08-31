"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { getRestaurant } from "../api/restaurant-api";

import { RestaurantBranding } from "@/components/common/restaurant-branding";

type Detail = {
  restaurant: {
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
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  owner?: {
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    lastLoginAt?: string | null;
  } | null;
  currentSubscription?: {
    subscription: {
      billingCycle: string;
      price: string;
      status: string;
      paymentStatus: string;
      startDate: string;
      endDate: string;
      renewalDate?: string | null;
    };
    plan: {
      name: string;
      code: string;
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

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-950">{value || "-"}</div>
    </div>
  );
}

export function RestaurantDetails({ id }: { id: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["super-admin", "restaurants", id],
    queryFn: () => getRestaurant(id),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState message="Unable to load restaurant details." />;

  const detail = data.data as Detail;
  const { restaurant, owner, currentSubscription, currentLicense } = detail;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <RestaurantBranding
              restaurant={{ name: restaurant.name, logo: restaurant.logo }}
              size="lg"
            />
            <p className="mt-1 text-sm text-slate-500">{restaurant.publicId}</p>
          </div>
          <StatusBadge status={restaurant.status} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Business Email" value={restaurant.email} />
          <Field label="Business Phone" value={restaurant.phone} />
          <Field label="GST / Tax Number" value={restaurant.taxNumber} />
          <Field label="Address" value={[restaurant.address, restaurant.city, restaurant.state, restaurant.country, restaurant.postalCode].filter(Boolean).join(", ")} />
          <Field label="Created" value={format(new Date(restaurant.createdAt), "MMM d, yyyy")} />
          <Field label="Updated" value={format(new Date(restaurant.updatedAt), "MMM d, yyyy")} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-base font-semibold">Restaurant Owner</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name" value={owner?.name} />
            <Field label="Email / Login ID" value={owner?.email} />
            <Field label="Phone" value={owner?.phone} />
            <Field label="Status" value={owner?.status ? <StatusBadge status={owner.status} /> : "-"} />
            <Field label="Last Login" value={owner?.lastLoginAt ? format(new Date(owner.lastLoginAt), "MMM d, yyyy h:mm a") : "-"} />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-base font-semibold">Subscription</h2>
          <div className="mt-4 space-y-4">
            <Field label="Plan" value={currentSubscription?.plan?.name} />
            <Field label="Billing Cycle" value={currentSubscription?.subscription.billingCycle} />
            <Field label="Price" value={currentSubscription?.subscription.price} />
            <Field label="Status" value={currentSubscription?.subscription.status ? <StatusBadge status={currentSubscription.subscription.status} /> : "-"} />
            <Field label="Renewal Date" value={currentSubscription?.subscription.renewalDate ? format(new Date(currentSubscription.subscription.renewalDate), "MMM d, yyyy") : "-"} />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-base font-semibold">License</h2>
          <div className="mt-4 space-y-4">
            <Field label="License Key" value={currentLicense?.licenseKey} />
            <Field label="Status" value={currentLicense?.status ? <StatusBadge status={currentLicense.status} /> : "-"} />
            <Field label="Issued" value={currentLicense?.issuedAt ? format(new Date(currentLicense.issuedAt), "MMM d, yyyy") : "-"} />
            <Field label="Expiry" value={currentLicense?.expiresAt ? format(new Date(currentLicense.expiresAt), "MMM d, yyyy") : "-"} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="text-base font-semibold">Recent Audit Activity</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {detail.recentAuditActivity?.length ? (
            detail.recentAuditActivity.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{log.action}</div>
                  <div className="text-xs text-slate-500">{log.entityType}</div>
                </div>
                <div className="text-slate-500">{format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}</div>
              </div>
            ))
          ) : (
            <div className="py-6 text-sm text-slate-500">No audit activity yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
