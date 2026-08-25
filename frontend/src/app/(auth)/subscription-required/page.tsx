"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Lock, XCircle, Clock } from "lucide-react";

function SubscriptionRequiredContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "LICENSE_MISSING";
  
  const getMessageDetails = () => {
    switch (reason) {
      case "LICENSE_EXPIRED":
        return {
          title: "Subscription Expired",
          description: "Your POS subscription has expired. Please contact your platform administrator to renew your license.",
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
        };
      case "LICENSE_SUSPENDED":
        return {
          title: "Account Suspended",
          description: "Your POS access has been temporarily suspended. Please contact support for more information.",
          icon: <Lock className="h-12 w-12 text-orange-500" />,
        };
      case "LICENSE_BLOCKED":
        return {
          title: "Access Blocked",
          description: "Your POS access has been blocked. Please contact the platform administrator immediately.",
          icon: <XCircle className="h-12 w-12 text-red-500" />,
        };
      case "LICENSE_REVOKED":
        return {
          title: "License Revoked",
          description: "Your POS license has been permanently revoked. You no longer have access to this system.",
          icon: <AlertCircle className="h-12 w-12 text-red-600" />,
        };
      default:
        return {
          title: "Access Restricted",
          description: "A valid active subscription is required to access the POS system.",
          icon: <Lock className="h-12 w-12 text-gray-500" />,
        };
    }
  };

  const details = getMessageDetails();

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-gray-800 bg-gray-950 p-8 text-center shadow-2xl">
        <div className="flex justify-center">{details.icon}</div>
        
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">{details.title}</h2>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">{details.description}</p>
        </div>

        <div className="mt-8">
          <Link
            href="/login"
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Return to Login
          </Link>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          If you believe this is an error, please contact your IT support or platform owner.
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionRequiredPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-sm text-white">Loading...</div>}>
      <SubscriptionRequiredContent />
    </Suspense>
  );
}
