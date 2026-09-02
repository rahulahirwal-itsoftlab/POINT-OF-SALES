"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCreateRestaurant } from "../hooks/use-restaurant-mutations";
import { usePlans } from "../../plans/hooks/use-plans";
import { extractApiError } from "@/lib/api/client";
import type { CreateRestaurantInput } from "../types/restaurant.types";
import { uploadRestaurantLogo } from "../api/restaurant-api";
import { RestaurantLogoUploader } from "@/components/common/restaurant-logo-uploader";
import { Eye, EyeOff } from "lucide-react";

type Plan = {
  id: string;
  planNumber?: string;
  name: string;
  code: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxUsers?: number | null;
  waiterLimit?: number | null;
  kitchenLimit?: number | null;
  receptionistLimit?: number | null;
  gstPercentage?: string | number | null;
  durationMonths?: number | null;
  features?: string[];
  isActive?: boolean;
};

const GST_PERCENTAGE = 18;

function addMonths(date: string, months: number) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + months);
  return value.toISOString().slice(0, 10);
}

export function RestaurantCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const createMutation = useCreateRestaurant();
  const plansQuery = usePlans();
  const plans = (plansQuery.data?.data ?? []).filter((plan: Plan) => plan.isActive !== false) as Plan[];
  const today = new Date().toISOString().slice(0, 10);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    restaurantName: "",
    businessEmail: "",
    businessPhone: "",
    alternatePhone: "",
    address: "",
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
    status: "ACTIVE",
    logo: "",
    website: "",
    ownerName: "",
    ownerEmail: "",
    loginEmail: "",
    ownerPhone: "",
    password: "",
    confirmPassword: "",
    planId: "",
    planType: "PREDEFINED",
    billingCycle: "MONTHLY",
    customPrice: "",
    customPlanName: "",
    customPlanDescription: "",
    customWaiterLimit: "5",
    customKitchenLimit: "2",
    customReceptionistLimit: "1",
    customBasePrice: "",
    customGstPercentage: "18",
    customFeatures: "Menu Management\nTable Management\nBilling\nReports",
    durationMonths: "1",
    currency: "INR",
    startDate: today,
    endDate: addMonths(today, 1),
    renewalDate: addMonths(today, 1),
    licenseStatus: "ACTIVE",
  });

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === form.planId), [form.planId, plans]);
  const defaultPrice = selectedPlan ? (form.billingCycle === "YEARLY" ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice) : "";
  const basePrice = form.planType === "CUSTOMIZED" ? Number(form.customBasePrice || 0) : Number(defaultPrice || 0);
  const gstPercentage = form.planType === "CUSTOMIZED" ? Number(form.customGstPercentage || 0) : Number(selectedPlan?.gstPercentage ?? GST_PERCENTAGE);
  const gstAmount = Number.isFinite(basePrice) && Number.isFinite(gstPercentage) ? basePrice * gstPercentage / 100 : 0;
  const finalAmount = basePrice + gstAmount;
  const roleLimits = form.planType === "CUSTOMIZED"
    ? {
        waiterLimit: Number(form.customWaiterLimit || 0),
        kitchenLimit: Number(form.customKitchenLimit || 0),
        receptionistLimit: Number(form.customReceptionistLimit || 0),
      }
    : {
        waiterLimit: selectedPlan?.waiterLimit ?? 0,
        kitchenLimit: selectedPlan?.kitchenLimit ?? 0,
        receptionistLimit: selectedPlan?.receptionistLimit ?? 0,
      };
  const staffLimit = roleLimits.waiterLimit + roleLimits.kitchenLimit + roleLimits.receptionistLimit;

  function update(field: keyof typeof form, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "planId" || field === "billingCycle") {
        const plan = plans.find((p) => p.id === (field === "planId" ? value : current.planId));
        if (plan) {
          const cycle = field === "billingCycle" ? value : current.billingCycle;
          next.customPrice = cycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;
        }
      }
      if (field === "planType") {
        next.planId = "";
        next.customPrice = "";
      }
      if (field === "ownerEmail" && !current.loginEmail) {
        next.loginEmail = value;
      }
      if (field === "startDate" || field === "billingCycle") {
        const months = Number(next.durationMonths || (next.billingCycle === "YEARLY" ? 12 : 1));
        const endDate = addMonths(field === "startDate" ? value : next.startDate, months);
        next.endDate = endDate;
        next.renewalDate = endDate;
      }
      if (field === "durationMonths") {
        const endDate = addMonths(next.startDate, Number(value || 1));
        next.endDate = endDate;
        next.renewalDate = endDate;
        next.billingCycle = Number(value) >= 12 ? "YEARLY" : "MONTHLY";
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (form.planType === "PREDEFINED" && !form.planId) {
      toast.error("Select a subscription plan.");
      return;
    }
    if (form.planType === "CUSTOMIZED" && (!form.customPlanName.trim() || [form.customWaiterLimit, form.customKitchenLimit, form.customReceptionistLimit].some((value) => Number(value) < 1) || Number(form.customBasePrice) < 0)) {
      toast.error("Enter valid custom plan name, role limits, and base price.");
      return;
    }

    setSubmitting(true);

    let finalLogoUrl = form.logo;
    if (logoFile) {
      setUploadingLogo(true);
      try {
        const uploadRes = await uploadRestaurantLogo(logoFile);
        if (uploadRes?.data?.imageUrl) {
          finalLogoUrl = uploadRes.data.imageUrl;
        }
      } catch (err) {
        toast.error("Unable to upload restaurant logo. " + extractApiError(err).message);
        setSubmitting(false);
        setUploadingLogo(false);
        return;
      } finally {
        setUploadingLogo(false);
      }
    }

    const payload: CreateRestaurantInput = {
      restaurant: {
        name: form.restaurantName,
        email: form.businessEmail,
        phone: form.businessPhone,
        alternatePhone: form.alternatePhone || undefined,
        address: form.addressLine1 || form.address || undefined,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        state: form.state,
        country: form.country,
        postalCode: form.postalCode,
        taxNumber: form.taxNumber || undefined,
        businessType: form.businessType as CreateRestaurantInput["restaurant"]["businessType"],
        cuisineType: form.cuisineType || undefined,
        timezone: form.timezone,
        currency: form.currency,
        logo: finalLogoUrl || undefined,
        website: form.website || undefined,
        status: form.status as CreateRestaurantInput["restaurant"]["status"],
      },
      admin: {
        name: form.ownerName,
        email: form.loginEmail,
        loginEmail: form.loginEmail,
        loginPassword: form.password,
        confirmPassword: form.confirmPassword,
      },
      subscription: {
        planType: form.planType as "PREDEFINED" | "CUSTOMIZED",
        planId: form.planType === "PREDEFINED" ? form.planId : undefined,
        billingCycle: form.billingCycle as "MONTHLY" | "YEARLY",
        price: form.planType === "CUSTOMIZED" ? Number(form.customBasePrice) : undefined,
        customPrice: form.planType === "CUSTOMIZED" ? Number(form.customBasePrice) : undefined,
        currency: form.currency,
        startDate: form.startDate,
        durationMonths: Number(form.durationMonths),
        renewalDate: form.renewalDate,
        customPlan: form.planType === "CUSTOMIZED" ? {
          name: form.customPlanName.trim(),
          description: form.customPlanDescription.trim() || undefined,
          basePrice: Number(form.customBasePrice),
          gstPercentage: Number(form.customGstPercentage),
          waiterLimit: Number(form.customWaiterLimit),
          kitchenLimit: Number(form.customKitchenLimit),
          receptionistLimit: Number(form.customReceptionistLimit),
          staffLimit,
          features: form.customFeatures.split("\n").map((feature) => feature.trim()).filter(Boolean),
        } : undefined,
      },
      license: {
        startDate: form.startDate,
        renewalDate: form.renewalDate,
      },
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success("Restaurant created successfully.");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/super-admin/restaurants");
      }
    } catch (error) {
      toast.error(extractApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
  const labelClass = "text-sm font-medium text-slate-700";
  const helperClass = "mt-1 text-xs font-normal text-slate-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Restaurant Information</h2>
        <p className="mt-1 text-sm text-slate-500">Create the organization tenant and the primary restaurant profile.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Restaurant Name *<input required className={inputClass} value={form.restaurantName} onChange={(e) => update("restaurantName", e.target.value)} /></label>
          <label className={labelClass}>Restaurant Email *<input required type="email" className={inputClass} value={form.businessEmail} onChange={(e) => update("businessEmail", e.target.value)} /></label>
          <label className={labelClass}>Phone *<input required className={inputClass} value={form.businessPhone} onChange={(e) => update("businessPhone", e.target.value)} /></label>
          <label className={labelClass}>Alternate Phone<input className={inputClass} value={form.alternatePhone} onChange={(e) => update("alternatePhone", e.target.value)} /></label>
          <label className={labelClass}>Initial Status<select className={inputClass} value={form.status} onChange={(e) => update("status", e.target.value)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLOCKED">Blocked</option><option value="SUSPENDED">Suspended</option></select></label>
          <label className={labelClass}>Address Line 1 *<input required className={inputClass} value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} /></label>
          <label className={labelClass}>Address Line 2<input className={inputClass} value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} /></label>
          <label className={labelClass}>City *<input required className={inputClass} value={form.city} onChange={(e) => update("city", e.target.value)} /></label>
          <label className={labelClass}>State *<input required className={inputClass} value={form.state} onChange={(e) => update("state", e.target.value)} /></label>
          <label className={labelClass}>Country *<input required className={inputClass} value={form.country} onChange={(e) => update("country", e.target.value)} /></label>
          <label className={labelClass}>Postal Code *<input required className={inputClass} value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></label>
          <label className={labelClass}>Tax Number<input className={inputClass} value={form.taxNumber} onChange={(e) => update("taxNumber", e.target.value)} /></label>
          <label className={labelClass}>Business Type *<select required className={inputClass} value={form.businessType} onChange={(e) => update("businessType", e.target.value)}><option value="RESTAURANT">Restaurant</option><option value="CAFE">Cafe</option><option value="HOTEL">Hotel</option><option value="CLOUD_KITCHEN">Cloud kitchen</option><option value="BAKERY">Bakery</option><option value="FAST_FOOD">Fast food</option><option value="BAR">Bar</option><option value="OTHER">Other</option></select></label>
          <label className={labelClass}>Cuisine Type<input className={inputClass} value={form.cuisineType} onChange={(e) => update("cuisineType", e.target.value)} /></label>
          <label className={labelClass}>Timezone *<input required className={inputClass} value={form.timezone} onChange={(e) => update("timezone", e.target.value)} /></label>
          <label className={labelClass}>Website<input type="url" className={inputClass} value={form.website} onChange={(e) => update("website", e.target.value)} /></label>
          <div className="md:col-span-2">
            <RestaurantLogoUploader
              value={form.logo}
              selectedFile={logoFile}
              onFileSelect={(file) => setLogoFile(file)}
              onRemoveLogo={() => {
                setLogoFile(null);
                update("logo", "");
              }}
              isUploading={uploadingLogo}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Restaurant Admin / Owner</h2>
        <p className="mt-1 text-sm text-slate-500">Primary administrator credentials for managing this restaurant tenant.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Owner Name *<input required className={inputClass} value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} /></label>
          <label className={labelClass}>Email *<input required type="email" className={inputClass} value={form.loginEmail} onChange={(e) => update("loginEmail", e.target.value)} /><span className={helperClass}>Used for administrator authentication.</span></label>
          <label className={labelClass}>Password *
            <div className="relative">
              <input
                required
                minLength={8}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                className={`${inputClass} pr-10`}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <label className={labelClass}>Confirm Password *
            <div className="relative">
              <input
                required
                minLength={8}
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                className={`${inputClass} pr-10`}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Subscription & Plan</h2>
        <p className="mt-1 text-sm text-slate-500">The backend calculates GST, duration, and active license in one transaction.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => update("planType", "PREDEFINED")} className={`rounded-lg border px-4 py-3 text-left text-sm transition duration-200 ${form.planType === "PREDEFINED" ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-[var(--text)] shadow-[var(--shadow-soft)]" : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--surface-strong)]"}`}>
            <span className="block font-semibold">Predefined Plan</span>
            <span className="text-xs text-[var(--muted)]">Use an active reusable plan.</span>
          </button>
          <button type="button" onClick={() => update("planType", "CUSTOMIZED")} className={`rounded-lg border px-4 py-3 text-left text-sm transition duration-200 ${form.planType === "CUSTOMIZED" ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-[var(--text)] shadow-[var(--shadow-soft)]" : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--surface-strong)]"}`}>
            <span className="block font-semibold">Customized Plan</span>
            <span className="text-xs text-[var(--muted)]">Private to this restaurant.</span>
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {form.planType === "PREDEFINED" ? (
            <div className="md:col-span-2">
              <p className={labelClass}>Active Predefined Plan *</p>
              <div className="mt-2 grid gap-3 lg:grid-cols-2">
                {plans.map((plan) => {
                  const planBase = Number(form.billingCycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice);
                  const planGst = Number(plan.gstPercentage ?? GST_PERCENTAGE);
                  const planFinal = planBase + planBase * planGst / 100;
                  const selected = form.planId === plan.id;
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => update("planId", plan.id)}
                      aria-pressed={selected}
                      className={`rounded-lg border p-4 text-left transition duration-200 ${selected ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_13%,var(--surface))] shadow-[var(--shadow-soft)]" : "border-[var(--border-soft)] bg-[var(--surface)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-strong)] hover:shadow-[var(--shadow-soft)]"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-[var(--text)]">{plan.name}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">{plan.planNumber ?? plan.code}</div>
                          <div className="text-xs text-[var(--muted)]">{plan.durationMonths ?? 1} month duration</div>
                        </div>
                        <div className="text-right">
                          {selected ? <span className="mb-1 inline-flex rounded-full border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text)]">Selected</span> : null}
                          <div className="text-lg font-extrabold text-[var(--text)]">{form.currency} {planFinal.toFixed(2)}</div>
                          <div className="text-xs font-medium text-[var(--muted)]">/{form.billingCycle === "YEARLY" ? "year" : "month"}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <span className="rounded border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-[var(--text)]">Waiter {plan.waiterLimit ?? "-"}</span>
                        <span className="rounded border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-[var(--text)]">Kitchen {plan.kitchenLimit ?? "-"}</span>
                        <span className="rounded border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-[var(--text)]">Reception {plan.receptionistLimit ?? "-"}</span>
                      </div>
                      <div className="mt-2 text-xs text-[var(--muted)]">Base {form.currency} {planBase.toFixed(2)} + GST {planGst}%</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <label className={labelClass}>Custom Plan Name *<input required className={inputClass} value={form.customPlanName} onChange={(e) => update("customPlanName", e.target.value)} /></label>
              <label className={labelClass}>Waiter Limit *<input required type="number" min="1" step="1" className={inputClass} value={form.customWaiterLimit} onChange={(e) => update("customWaiterLimit", e.target.value)} /></label>
              <label className={labelClass}>Kitchen Limit *<input required type="number" min="1" step="1" className={inputClass} value={form.customKitchenLimit} onChange={(e) => update("customKitchenLimit", e.target.value)} /></label>
              <label className={labelClass}>Receptionist Limit *<input required type="number" min="1" step="1" className={inputClass} value={form.customReceptionistLimit} onChange={(e) => update("customReceptionistLimit", e.target.value)} /></label>
              <label className={labelClass}>Base Price ({form.currency}) *<input required type="number" min="0" step="0.01" className={inputClass} value={form.customBasePrice} onChange={(e) => update("customBasePrice", e.target.value)} /></label>
              <label className={labelClass}>GST Percentage *<input required type="number" min="0" max="28" step="0.01" className={inputClass} value={form.customGstPercentage} onChange={(e) => update("customGstPercentage", e.target.value)} /></label>
              <label className={`${labelClass} md:col-span-2`}>Custom Description<input className={inputClass} value={form.customPlanDescription} onChange={(e) => update("customPlanDescription", e.target.value)} /></label>
              <label className={`${labelClass} md:col-span-2`}>Features<textarea rows={4} className={inputClass} value={form.customFeatures} onChange={(e) => update("customFeatures", e.target.value)} /></label>
            </>
          )}
          <label className={labelClass}>Duration *<select className={inputClass} value={form.durationMonths} onChange={(e) => update("durationMonths", e.target.value)}><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option></select></label>
          <label className={labelClass}>Billing Cycle<select className={inputClass} value={form.billingCycle} onChange={(e) => update("billingCycle", e.target.value)}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label>
          <label className={labelClass}>Currency<input className={inputClass} value={form.currency} onChange={(e) => update("currency", e.target.value.toUpperCase())} /></label>
          <label className={labelClass}>Start Date *<input required type="date" className={inputClass} value={form.startDate} onChange={(e) => update("startDate", e.target.value)} /></label>
          <label className={labelClass}>Calculated Expiry<input readOnly type="date" className={`${inputClass} bg-slate-50`} value={form.endDate} /></label>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Review</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <div><span className="font-medium text-slate-950">Restaurant:</span> {form.restaurantName || "-"}</div>
          <div><span className="font-medium text-slate-950">Organization:</span> {form.restaurantName || "-"}</div>
          <div><span className="font-medium text-slate-950">Owner:</span> {form.ownerName || "-"}</div>
          <div><span className="font-medium text-slate-950">Login Email:</span> {form.loginEmail || "-"}</div>
          <div><span className="font-medium text-slate-950">Plan:</span> {form.planType === "CUSTOMIZED" ? form.customPlanName || "Custom plan" : selectedPlan?.name ?? "-"}</div>
          <div><span className="font-medium text-slate-950">Plan Type:</span> {form.planType}</div>
          <div><span className="font-medium text-slate-950">Staff Limit:</span> {staffLimit || "-"}</div>
          <div><span className="font-medium text-slate-950">Waiters:</span> {roleLimits.waiterLimit || "-"}</div>
          <div><span className="font-medium text-slate-950">Kitchen:</span> {roleLimits.kitchenLimit || "-"}</div>
          <div><span className="font-medium text-slate-950">Receptionists:</span> {roleLimits.receptionistLimit || "-"}</div>
          <div><span className="font-medium text-slate-950">Billing:</span> {form.billingCycle}</div>
          <div><span className="font-medium text-slate-950">Start:</span> {form.startDate}</div>
          <div><span className="font-medium text-slate-950">Expiry:</span> {form.endDate}</div>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] p-4 text-sm">
          <div className="flex justify-between py-1"><span className="text-[var(--muted)]">Base Price</span><span className="font-semibold text-[var(--text)]">{form.currency} {basePrice.toFixed(2)}</span></div>
          <div className="flex justify-between py-1"><span className="text-[var(--muted)]">GST ({gstPercentage || 0}%)</span><span className="font-semibold text-[var(--text)]">{form.currency} {gstAmount.toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between border-t border-[var(--border-soft)] pt-3 text-base"><span className="font-semibold text-[var(--text)]">Final Amount</span><span className="font-bold text-[var(--text)]">{form.currency} {finalAmount.toFixed(2)}</span></div>
          <p className="mt-2 text-xs text-[var(--muted)]">Backend recalculates this amount before creating the subscription.</p>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.push("/super-admin/restaurants")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
          Cancel
        </button>
        <button disabled={submitting || plansQuery.isLoading} type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60">
          {submitting ? "Creating..." : "Create Restaurant"}
        </button>
      </div>
    </form>
  );
}
