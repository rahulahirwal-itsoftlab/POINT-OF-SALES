"use client";

import { useEffect, useState, use } from "react";
import { superAdminApi } from "@/lib/api/super-admin.api";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/common/page-header";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters/currency";
import { extractApiError } from "@/lib/api/client";
import { useConfirmation } from "@/components/common/modal";

type SubscriptionDetail = {
  subscription: {
    id: string;
    restaurantId: string;
    planId: string;
    status: "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "PENDING";
    billingCycle: "MONTHLY" | "YEARLY";
    startDate: string;
    endDate: string;
    price: string;
    currency: string;
  };
  organization?: { name: string };
  restaurant?: { name: string };
  owner?: { fullName: string; email: string };
  plan?: { name: string };
};

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { confirm } = useConfirmation();
  const { id } = use(params);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscription = () => {
    setLoading(true);
    superAdminApi.getSubscription(id)
      .then(setSubscription)
      .catch(() => {
        toast.error("Failed to load subscription details.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const handleAction = async (action: "renew" | "suspend" | "cancel" | "reactivate") => {
    const isDestructive = action === "cancel" || action === "suspend";
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Subscription`,
      description: `Are you sure you want to ${action} this subscription?`,
      variant: isDestructive ? "danger" : action === "reactivate" ? "info" : "success",
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
    });

    if (!confirmed) return;
    
    setActionLoading(true);
    try {
      if (action === "renew") {
        const durationMonths = subscription?.subscription.billingCycle === "YEARLY" ? 12 : 1;
        await superAdminApi.renewSubscription(id, {
          billingCycle: subscription?.subscription.billingCycle,
          price: Number(subscription?.subscription.price ?? 0),
          currency: subscription?.subscription.currency ?? "INR",
          durationMonths,
        });
      }
      if (action === "suspend") await superAdminApi.suspendSubscription(id, { reason: "Admin suspension" });
      if (action === "cancel") await superAdminApi.cancelSubscription(id, { reason: "Admin cancellation" });
      if (action === "reactivate") await superAdminApi.reactivateSubscription(id);
      
      toast.success(`Subscription ${action}ed successfully`);
      fetchSubscription();
    } catch (err) {
      toast.error(extractApiError(err).message || `Failed to ${action} subscription`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500 animate-pulse">Loading subscription details...</div>;
  }

  if (!subscription) {
    return <div className="p-12 text-center text-red-500">Subscription not found.</div>;
  }

  const record = subscription.subscription;
  const restaurant = subscription.restaurant;
  const plan = subscription.plan;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/subscriptions" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to Subscriptions
        </Link>
      </div>
      
      <PageHeader 
        title={`Subscription Details`} 
        description={`Manage billing and lifecycle for subscription ID: ${record.id}`} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border bg-white shadow-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold border-b pb-4 mb-4">Overview</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-semibold text-lg mt-1">{record.status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Organization</div>
              <div className="font-medium mt-1">{subscription.organization?.name ?? "Not assigned"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Restaurant</div>
              <div className="font-medium mt-1">{restaurant?.name ?? record.restaurantId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Owner</div>
              <div className="font-medium mt-1">{subscription.owner?.fullName ?? "Not assigned"}</div>
              {subscription.owner?.email ? <div className="text-xs text-gray-500">{subscription.owner.email}</div> : null}
            </div>
            <div>
              <div className="text-sm text-gray-500">Plan</div>
              <div className="font-medium mt-1 capitalize">{plan?.name ?? record.planId} ({record.billingCycle})</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Current Period</div>
              <div className="font-medium mt-1">
                {format(new Date(record.startDate), "MMM d, yyyy")} - {format(new Date(record.endDate), "MMM d, yyyy")}
              </div>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {Math.max(0, Math.ceil((new Date(record.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Days Remaining
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Assigned Subscription Rate</div>
              <div className="font-semibold text-lg mt-1 text-emerald-700">
                {formatCurrency(record.price, record.currency)} / {record.billingCycle.toLowerCase()}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Assigned directly to this restaurant subscription record.</p>
            </div>
          </div>
        </div>

        <div className="border bg-white shadow-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold border-b pb-4 mb-4">Lifecycle Actions</h3>
          <p className="text-sm text-gray-500 mb-6">
            Warning: These actions take effect immediately and will impact the restaurant's active licenses and login capabilities.
          </p>
          
          <div className="space-y-3">
            {record.status === "ACTIVE" ? (
              <>
                <button 
                  disabled={actionLoading}
                  onClick={() => handleAction("renew")} 
                  className="w-full text-left px-4 py-3 border rounded-lg bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors font-medium"
                >
                  Renew Subscription
                  <div className="text-xs font-normal opacity-80 mt-1">Extends the current period by one billing cycle.</div>
                </button>
                <button 
                  disabled={actionLoading}
                  onClick={() => handleAction("suspend")} 
                  className="w-full text-left px-4 py-3 border rounded-lg bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 transition-colors font-medium"
                >
                  Suspend Subscription
                  <div className="text-xs font-normal opacity-80 mt-1">Temporarily revokes access without cancelling.</div>
                </button>
                <button 
                  disabled={actionLoading}
                  onClick={() => handleAction("cancel")} 
                  className="w-full text-left px-4 py-3 border rounded-lg bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors font-medium"
                >
                  Cancel Subscription
                  <div className="text-xs font-normal opacity-80 mt-1">Permanently cancels and revokes licenses immediately.</div>
                </button>
              </>
            ) : (
              <>
                <button 
                  disabled={actionLoading}
                  onClick={() => handleAction("reactivate")} 
                  className="w-full text-left px-4 py-3 border rounded-lg bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors font-medium"
                >
                  Reactivate Subscription
                  <div className="text-xs font-normal opacity-80 mt-1">Restores active status, updates license validity, and reactivates access.</div>
                </button>
                <button 
                  disabled={actionLoading}
                  onClick={() => handleAction("renew")} 
                  className="w-full text-left px-4 py-3 border rounded-lg bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors font-medium"
                >
                  Renew Subscription
                  <div className="text-xs font-normal opacity-80 mt-1">Renews subscription for a new billing cycle starting today.</div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
