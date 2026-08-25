"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/common/page-header";
import Link from "next/link";
import { triggerLicenseExpiry } from "@/features/super-admin/licenses/api/license-api";
import { useConfirmation } from "@/components/common/modal";

export default function LicenseExpiryPage() {
  const { confirm } = useConfirmation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ processedCount: number } | null>(null);

  const handleTrigger = async () => {
    const confirmed = await confirm({
      title: "Bulk License Expiration Scan",
      description: "This will scan all active licenses and mark licenses past their expiry date as EXPIRED. Proceed?",
      variant: "warning",
      confirmText: "Run Expiry Scan",
    });

    if (!confirmed) return;
    
    setLoading(true);
    try {
      const response = await triggerLicenseExpiry();
      setResult(response.data);
      toast.success(`Successfully processed ${response.data.processedCount} expired licenses`);
    } catch {
      toast.error("Failed to trigger expiry scan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/licenses" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to Licenses
        </Link>
      </div>
      
      <PageHeader title="License Expiry Management" description="Manually trigger bulk expiration scan for platform licenses." />
      
      <div className="border bg-white shadow-sm rounded-xl p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Bulk Expiration Scan</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            This will scan all currently ACTIVE licenses. Any license where the valid period has elapsed will be automatically marked as EXPIRED, and their associated restaurant logins will be suspended.
          </p>
        </div>
        
        <button
          onClick={handleTrigger}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-8 py-2"
        >
          {loading ? "Scanning Licenses..." : "Run Expiry Scan Now"}
        </button>
        
        {result && (
          <div className="mt-8 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 max-w-sm mx-auto text-left">
            <h4 className="font-semibold mb-2 text-center">Scan Complete</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Active Scanned:</span>
                <span className="font-medium">{result.processedCount}</span>
              </div>
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Newly Expired:</span>
                <span>{result.processedCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
