export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border-soft)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}>
      <div>
        {breadcrumb ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>{breadcrumb}</p> : null}
        <h1 className="heritage-heading text-3xl font-bold tracking-normal">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--muted)" }}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
