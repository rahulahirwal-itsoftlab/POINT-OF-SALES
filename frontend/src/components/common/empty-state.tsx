import { SearchX } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 82%, transparent)" }}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>
        <SearchX className="h-5 w-5" />
      </div>
      <h2 className="heritage-heading text-xl font-bold">{title}</h2>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm" style={{ color: "var(--muted)" }}>{description}</p> : null}
    </div>
  );
}
