import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorState({
  message = "Unable to load data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="my-4 flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center text-sm"
      style={{
        borderColor: "color-mix(in srgb, var(--danger) 40%, var(--border-soft))",
        background: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
        color: "var(--danger)",
      }}
    >
      <div className="flex items-center gap-2 font-bold">
        <AlertTriangle className="h-4 w-4" />
        <span>{message}</span>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition"
          style={{ background: "var(--danger)" }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </button>
      ) : null}
    </div>
  );
}
