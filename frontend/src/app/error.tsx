"use client";

import { useEffect } from "react";
import { frontendLogger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    frontendLogger.error(
      { digest: error.digest, route: typeof window !== "undefined" ? window.location.pathname : undefined },
      `Unhandled route error: ${error.message}`
    );
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md rounded-xl border border-red-100 bg-red-50 p-8 shadow-sm">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 text-lg font-bold text-slate-900">Something went wrong</h2>
        <p className="mb-6 text-xs text-slate-600">
          We couldn't load this page right now. Please try again.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
