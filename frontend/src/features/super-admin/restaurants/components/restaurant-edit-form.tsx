"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getRestaurant, updateRestaurant, updateSubscription } from "../api/restaurant-api";
import type { UpdateRestaurantInput } from "../types/restaurant.types";
import { extractApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/query-keys";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ErrorState } from "@/components/common/error-state";

export function RestaurantEditForm({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["super-admin", "restaurants", id],
    queryFn: () => getRestaurant(id),
  });

  const detail = data?.data;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    alternatePhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    taxNumber: "",
    businessType: "RESTAURANT",
    cuisineType: "",
    timezone: "Asia/Kolkata",
    currency: "INR",
    status: "ACTIVE",
    // Subscription fields
    subscriptionId: "",
    price: "",
    billingCycle: "MONTHLY",
    startDate: "",
    endDate: "",
    subscriptionStatus: "ACTIVE",
  });

  useEffect(() => {
    if (detail?.restaurant) {
      const r = detail.restaurant;
      const sub = detail.currentSubscription?.subscription;
      setForm({
        name: r.name || "",
        email: r.email || "",
        phone: r.phone || "",
        alternatePhone: r.alternatePhone || "",
        addressLine1: r.addressLine1 || r.address || "",
        addressLine2: r.addressLine2 || "",
        city: r.city || "",
        state: r.state || "",
        country: r.country || "India",
        postalCode: r.postalCode || "",
        taxNumber: r.taxNumber || "",
        businessType: r.businessType || "RESTAURANT",
        cuisineType: r.cuisineType || "",
        timezone: r.timezone || "Asia/Kolkata",
        currency: r.currency || "INR",
        status: r.status || "ACTIVE",
        subscriptionId: sub?.id || "",
        price: sub?.price ? String(sub.price) : "",
        billingCycle: sub?.billingCycle || "MONTHLY",
        startDate: sub?.startDate ? sub.startDate.slice(0, 10) : "",
        endDate: sub?.endDate ? sub.endDate.slice(0, 10) : "",
        subscriptionStatus: sub?.status || "ACTIVE",
      });
    }
  }, [detail]);

  function update(field: keyof typeof form, value: string) {
    setForm((curr) => ({ ...curr, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Update restaurant details
      await updateRestaurant(id, {
        restaurant: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          alternatePhone: form.alternatePhone || undefined,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          city: form.city,
          state: form.state,
          country: form.country,
          postalCode: form.postalCode,
          taxNumber: form.taxNumber || undefined,
          businessType: form.businessType as NonNullable<UpdateRestaurantInput["restaurant"]>["businessType"],
          cuisineType: form.cuisineType || undefined,
          timezone: form.timezone,
          currency: form.currency,
          status: form.status as NonNullable<UpdateRestaurantInput["restaurant"]>["status"],
        },
      });

      // 2. Update subscription details if custom price or timestamps modified
      if (form.subscriptionId) {
        await updateSubscription(form.subscriptionId, {
          price: form.price ? Number(form.price) : undefined,
          billingCycle: form.billingCycle,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
          status: form.subscriptionStatus,
        });
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      await queryClient.invalidateQueries({ queryKey: ["super-admin", "restaurants", id] });
      toast.success("Restaurant and subscription updated successfully.");
      router.push("/super-admin/restaurants");
    } catch (err) {
      toast.error(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !detail) return <ErrorState message="Unable to load restaurant details for editing." />;

  const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
  const labelClass = "text-sm font-medium text-slate-700";
  const helperClass = "mt-1 text-xs font-normal text-slate-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Restaurant Profile</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Restaurant Name *<input required className={inputClass} value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
          <label className={labelClass}>Email *<input required type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
          <label className={labelClass}>Phone *<input required className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} /></label>
          <label className={labelClass}>Alternate Phone<input className={inputClass} value={form.alternatePhone} onChange={(e) => update("alternatePhone", e.target.value)} /></label>
          <label className={labelClass}>Status<select className={inputClass} value={form.status} onChange={(e) => update("status", e.target.value)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLOCKED">Blocked</option><option value="SUSPENDED">Suspended</option></select></label>
          <label className={labelClass}>Address Line 1 *<input required className={inputClass} value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} /></label>
          <label className={labelClass}>Address Line 2<input className={inputClass} value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} /></label>
          <label className={labelClass}>City *<input required className={inputClass} value={form.city} onChange={(e) => update("city", e.target.value)} /></label>
          <label className={labelClass}>State *<input required className={inputClass} value={form.state} onChange={(e) => update("state", e.target.value)} /></label>
          <label className={labelClass}>Country *<input required className={inputClass} value={form.country} onChange={(e) => update("country", e.target.value)} /></label>
          <label className={labelClass}>Postal Code *<input required className={inputClass} value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></label>
          <label className={labelClass}>GST / Tax Number<input className={inputClass} value={form.taxNumber} onChange={(e) => update("taxNumber", e.target.value)} /></label>
          <label className={labelClass}>Business Type *<select required className={inputClass} value={form.businessType} onChange={(e) => update("businessType", e.target.value)}><option value="RESTAURANT">Restaurant</option><option value="CAFE">Cafe</option><option value="HOTEL">Hotel</option><option value="CLOUD_KITCHEN">Cloud kitchen</option><option value="BAKERY">Bakery</option><option value="FAST_FOOD">Fast food</option><option value="BAR">Bar</option><option value="OTHER">Other</option></select></label>
          <label className={labelClass}>Cuisine Type<input className={inputClass} value={form.cuisineType} onChange={(e) => update("cuisineType", e.target.value)} /></label>
          <label className={labelClass}>Timezone *<input required className={inputClass} value={form.timezone} onChange={(e) => update("timezone", e.target.value)} /></label>
          <label className={labelClass}>Currency *<input required className={inputClass} value={form.currency} onChange={(e) => update("currency", e.target.value.toUpperCase())} /></label>
        </div>
      </section>

      {form.subscriptionId && (
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Subscription & Rate Editing</h2>
          <p className="mt-1 text-sm text-slate-500">Super Admin can edit the subscription price rate and validity timestamps directly in PostgreSQL.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              Subscription Amount ({form.currency}) *
              <input type="number" step="0.01" min="0" required className={inputClass} value={form.price} onChange={(e) => update("price", e.target.value)} />
              <span className={helperClass}>Custom subscription price stored in Neon DB (`subscriptions.price`).</span>
            </label>
            <label className={labelClass}>
              Billing Cycle
              <select className={inputClass} value={form.billingCycle} onChange={(e) => update("billingCycle", e.target.value)}>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </label>
            <label className={labelClass}>
              Start Date *
              <input required type="date" className={inputClass} value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
            </label>
            <label className={labelClass}>
              Expiry / End Date *
              <input required type="date" className={inputClass} value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
            </label>
            <label className={labelClass}>
              Subscription Status
              <select className={inputClass} value={form.subscriptionStatus} onChange={(e) => update("subscriptionStatus", e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </label>
          </div>
        </section>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.push("/super-admin/restaurants")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
          Cancel
        </button>
        <button disabled={submitting} type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60">
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
