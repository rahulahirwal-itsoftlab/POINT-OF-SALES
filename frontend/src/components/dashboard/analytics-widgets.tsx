import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils/cn";

export type AnalyticsMetricTab = {
  key: string;
  label: string;
  yKey: string;
  formatValue?: (val: number) => string;
  stroke?: string;
  gradientStart?: string;
  gradientStop?: string;
};

export type MetricItem = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
};

export type ChartDatum = Record<string, string | number>;

const chartPalette = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#475569"];

const toneClasses: Record<NonNullable<MetricItem["tone"]>, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export function AnalyticsPanel({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("heritage-card rounded-xl p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
          {subtitle ? <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function BusinessAnalyticsChart({
  title,
  subtitle,
  data,
  xKey,
  metrics,
  activeMetricKey,
  onMetricChange,
  emptyMessage = "No analytical data available for this range.",
  className,
}: {
  title: string;
  subtitle?: string;
  data: ChartDatum[];
  xKey: string;
  metrics: AnalyticsMetricTab[];
  activeMetricKey: string;
  onMetricChange: (key: string) => void;
  emptyMessage?: string;
  isLive?: boolean;
  lastUpdated?: string;
  className?: string;
}) {
  const activeTab = metrics.find((m) => m.key === activeMetricKey) ?? metrics[0];
  const strokeColor = activeTab?.stroke ?? "#0f766e";
  const startColor = activeTab?.gradientStart ?? "#0f766e";
  const stopColor = activeTab?.gradientStop ?? "#f0fdfa";

  const yKey = activeTab.yKey;
  let growthPercent: number | null = null;
  let latestValue: number | null = null;

  if (data.length >= 2) {
    const first = Number(data[0][yKey] ?? 0);
    const last = Number(data[data.length - 1][yKey] ?? 0);
    latestValue = last;
    if (first > 0) {
      growthPercent = Number((((last - first) / first) * 100).toFixed(1));
    }
  } else if (data.length === 1) {
    latestValue = Number(data[0][yKey] ?? 0);
  }

  const formattedLatest = latestValue !== null
    ? (activeTab.formatValue ? activeTab.formatValue(latestValue) : String(latestValue))
    : null;

  return (
    <section className={cn("heritage-card rounded-2xl border p-5 shadow-sm transition", className)} style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
      {/* Header & Metric Selector Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 mb-4" style={{ borderColor: "var(--border-soft)" }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>{title}</h2>
          {subtitle ? <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border p-1" style={{ borderColor: "var(--border-soft)", background: "var(--background)" }}>
          {metrics.map((m) => {
            const isActive = m.key === activeMetricKey;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onMetricChange(m.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  isActive
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric Highline & Growth Indicator */}
      {data.length ? (
        <div className="mb-4 flex flex-wrap items-baseline gap-4">
          {formattedLatest ? (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current {activeTab.label}</span>
              <div className="text-3xl font-black text-slate-950">{formattedLatest}</div>
            </div>
          ) : null}

          {growthPercent !== null ? (
            <div className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", growthPercent >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200")}>
              {growthPercent >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{growthPercent >= 0 ? `+${growthPercent}%` : `${growthPercent}%`}</span>
              <span className="font-normal text-slate-500">vs period start</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Main Area Chart */}
      {!data.length ? (
        <EmptyState title="No analytics available" description={emptyMessage} />
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 16, right: 20, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id={`gradient-${activeTab.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={startColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={stopColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                width={64}
                axisLine={false}
                tickFormatter={(val) => (activeTab.formatValue ? activeTab.formatValue(val) : String(val))}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                formatter={(value) => [activeTab.formatValue ? activeTab.formatValue(Number(value)) : String(value), activeTab.label]}
              />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke={strokeColor}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#gradient-${activeTab.key})`}
                dot={{ r: 4, strokeWidth: 2, fill: "#ffffff", stroke: strokeColor }}
                activeDot={{ r: 7, strokeWidth: 2, fill: strokeColor, stroke: "#ffffff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export const LiveMarketAnalyticsChart = BusinessAnalyticsChart;

export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
            <span className={cn("h-2.5 w-2.5 rounded-full border", toneClasses[item.tone ?? "blue"])} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs text-slate-500">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function ResponsiveLineAnalytics({
  data,
  xKey,
  yKey,
  stroke = "#2563eb",
  emptyMessage,
  formatValue,
}: {
  data: ChartDatum[];
  xKey: string;
  yKey: string;
  stroke?: string;
  emptyMessage: string;
  formatValue?: (val: number) => string;
}) {
  if (!data.length) return <EmptyState title="No data available for the selected period." description={emptyMessage} />;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            width={56}
            tickFormatter={(val) => (formatValue ? formatValue(val) : String(val))}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
            formatter={(value) => [formatValue ? formatValue(Number(value)) : String(value), yKey]}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={stroke}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ResponsiveBarAnalytics({ data, xKey, yKey, fill = "#2563eb", layout = "horizontal", emptyMessage }: { data: ChartDatum[]; xKey: string; yKey: string; fill?: string; layout?: "horizontal" | "vertical"; emptyMessage: string }) {
  if (!data.length) return <EmptyState title="No data available for the selected period." description={emptyMessage} />;
  const vertical = layout === "vertical";
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 8, right: 18, bottom: 8, left: vertical ? 34 : 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
          {vertical ? <XAxis type="number" tick={{ fontSize: 12 }} /> : <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />}
          {vertical ? <YAxis dataKey={xKey} type="category" tick={{ fontSize: 12 }} width={92} /> : <YAxis tick={{ fontSize: 12 }} width={48} />}
          <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0" }} />
          <Bar dataKey={yKey} fill={fill} radius={vertical ? [0, 8, 8, 0] : [8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutAnalytics({ data, nameKey, valueKey, centerLabel, centerValue, emptyMessage }: { data: ChartDatum[]; nameKey: string; valueKey: string; centerLabel: string; centerValue: string | number; emptyMessage: string }) {
  const positive = data.filter((item) => Number(item[valueKey]) > 0);
  if (!positive.length) return <EmptyState title="No data available for the selected period." description={emptyMessage} />;
  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={positive} innerRadius={64} outerRadius={92} dataKey={valueKey} nameKey={nameKey} paddingAngle={3}>
              {positive.map((_, index) => <Cell key={index} fill={chartPalette[index % chartPalette.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{centerLabel}</span>
          <span className="text-2xl font-bold text-slate-950">{centerValue}</span>
        </div>
      </div>
      <div className="space-y-2">
        {positive.map((item, index) => (
          <div key={String(item[nameKey])} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: chartPalette[index % chartPalette.length] }} />
              {String(item[nameKey])}
            </span>
            <span className="font-bold text-slate-950">{String(item[valueKey])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OccupancyAnalytics({ total, occupied, available, pending = 0 }: { total: number; occupied: number; available: number; pending?: number }) {
  const denominator = Math.max(total, occupied + available + pending, 1);
  const percent = Math.round(((occupied + pending) / denominator) * 100);
  const dots = Array.from({ length: Math.min(denominator, 36) }, (_, index) => index);
  return (
    <div className="grid gap-5 md:grid-cols-[160px_1fr] md:items-center">
      <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(#d97706 ${percent * 3.6}deg, #e2e8f0 0deg)` }}>
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-3xl font-bold text-slate-950">{percent}%</span>
          <span className="text-xs font-semibold text-slate-500">occupied</span>
        </div>
      </div>
      <div>
        <div className="flex flex-wrap gap-1.5">
          {dots.map((dot) => (
            <span
              key={dot}
              className={cn("h-4 w-4 rounded-full border", dot < occupied ? "border-amber-500 bg-amber-500" : dot < occupied + pending ? "border-orange-500 bg-orange-100" : "border-emerald-500 bg-emerald-50")}
            />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-amber-50 p-3 text-amber-700"><strong>{occupied}</strong><br />Occupied</div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700"><strong>{available}</strong><br />Available</div>
          <div className="rounded-lg bg-orange-50 p-3 text-orange-700"><strong>{pending}</strong><br />Billing</div>
        </div>
      </div>
    </div>
  );
}

export function ActivityTimeline({ rows }: { rows: Array<{ id: string; title: string; subtitle: string; value?: string; status?: React.ReactNode; time: string }> }) {
  if (!rows.length) return <EmptyState title="No recent activity" description="Live operational activity will appear here when data is available." />;
  return (
    <div className="space-y-3">
      {rows.slice(0, 6).map((row) => (
        <div key={row.id} className="grid grid-cols-[78px_1fr_auto] items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
          <span className="text-xs font-semibold text-slate-500">{row.time}</span>
          <span>
            <strong className="block text-slate-950">{row.title}</strong>
            <span className="text-xs text-slate-500">{row.subtitle}</span>
          </span>
          <span className="text-right text-xs font-bold text-slate-700">{row.value ?? row.status}</span>
        </div>
      ))}
    </div>
  );
}
