"use client";

import { useState } from "react";
import type { AuditLogListItem } from "../api/audit-api";
import { useAuditLogDetail } from "../hooks/use-audit-logs";

interface Props {
  rows: AuditLogListItem[];
}

function roleBadgeColor(role: string) {
  switch (role) {
    case "SUPER_ADMIN": return "bg-purple-100 text-purple-800";
    case "RESTAURANT_ADMIN": return "bg-blue-100 text-blue-800";
    case "WAITER": return "bg-green-100 text-green-800";
    case "KITCHEN": return "bg-orange-100 text-orange-800";
    case "RECEPTION": return "bg-teal-100 text-teal-800";
    default: return "bg-gray-100 text-gray-700";
  }
}

function actionBadgeColor(action: string) {
  if (action.includes("FAILED") || action.includes("BLOCKED") || action.includes("REVOKED")) {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  if (action.includes("CREATED") || action.includes("SUCCESS") || action.includes("ACTIVATED")) {
    return "bg-green-50 text-green-700 border border-green-200";
  }
  if (action.includes("UPDATED") || action.includes("RENEWED") || action.includes("EXTENDED")) {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  if (action.includes("CANCELLED") || action.includes("EXPIRED") || action.includes("DEACTIVATED")) {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  return "bg-indigo-50 text-indigo-700 border border-indigo-200";
}

function AuditDetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useAuditLogDetail(id);
  const item = data?.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Audit Log Detail</h2>
            <p className="text-xs text-slate-500">Complete trace for this event</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : !item ? (
          <div className="p-6 text-sm text-slate-500">Audit record not found.</div>
        ) : (
          <div className="divide-y divide-slate-100 px-6">
            {/* Correlation */}
            <Section title="Correlation">
              <Field label="Request ID">
                {item.audit.requestId ? (
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                    {item.audit.requestId}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs italic">—</span>
                )}
              </Field>
              <Field label="Timestamp">
                <span className="font-mono text-xs text-slate-700">
                  {new Date(item.audit.createdAt).toISOString()}
                </span>
              </Field>
            </Section>

            {/* Actor */}
            <Section title="Actor">
              <Field label="Name">{item.actor?.name ?? <span className="text-slate-400 italic text-xs">System</span>}</Field>
              <Field label="Email">{item.actor?.email ?? "—"}</Field>
              <Field label="Role">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeColor(item.audit.actorRole)}`}>
                  {item.audit.actorRole}
                </span>
              </Field>
            </Section>

            {/* Event */}
            <Section title="Event">
              <Field label="Module">
                <span className="font-mono text-xs text-slate-600">{item.audit.module ?? "—"}</span>
              </Field>
              <Field label="Action">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${actionBadgeColor(item.audit.action)}`}>
                  {item.audit.action}
                </span>
              </Field>
              <Field label="Description">
                {item.audit.description ?? <span className="text-slate-400 italic text-xs">—</span>}
              </Field>
            </Section>

            {/* Entity */}
            <Section title="Entity">
              <Field label="Type">{item.audit.entityType}</Field>
              <Field label="Public ID">
                <span className="font-mono text-xs text-slate-600">{item.audit.entityPublicId ?? "—"}</span>
              </Field>
            </Section>

            {/* Restaurant */}
            <Section title="Restaurant">
              <Field label="Name">{item.restaurant?.name ?? <span className="text-slate-400 italic text-xs">Platform-level</span>}</Field>
              <Field label="Public ID">
                <span className="font-mono text-xs text-slate-500">{item.restaurant?.publicId ?? "—"}</span>
              </Field>
            </Section>

            {/* Network */}
            {/* <Section title="Network">
              <Field label="IP Address">{item.audit.ipAddress ?? "—"}</Field>
              <Field label="User Agent">
                <span className="break-all text-xs text-slate-500">{item.audit.userAgent ?? "—"}</span>
              </Field>
            </Section> */}

            {/* Before / After */}
            {(item.audit.oldValues || item.audit.newValues) && (
              <Section title="Changes">
                {item.audit.oldValues && (
                  <Field label="Before">
                    <pre className="mt-1 overflow-auto rounded bg-red-50 p-2 text-xs text-red-800">
                      {JSON.stringify(item.audit.oldValues, null, 2)}
                    </pre>
                  </Field>
                )}
                {item.audit.newValues && (
                  <Field label="After">
                    <pre className="mt-1 overflow-auto rounded bg-green-50 p-2 text-xs text-green-800">
                      {JSON.stringify(item.audit.newValues, null, 2)}
                    </pre>
                  </Field>
                )}
              </Section>
            )}

            {/* Metadata */}
            {item.audit.metadata && (
              <Section title="Metadata">
                <pre className="overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(item.audit.metadata, null, 2)}
                </pre>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-28 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span className="text-slate-800">{children}</span>
    </div>
  );
}

export function AuditTable({ rows }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
        <p className="text-sm font-medium text-slate-500">No audit logs found</p>
        <p className="mt-1 text-xs text-slate-400">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Module</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Restaurant</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Request ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => (
              <tr
                key={item.audit.id}
                className="cursor-pointer hover:bg-indigo-50/40 transition-colors"
                onClick={() => setSelectedId(item.audit.id)}
              >
                <td className="px-4 py-3 text-xs text-slate-600">
                  {new Date(item.audit.createdAt).toLocaleDateString()}
                  <span className="block text-[10px] text-slate-400">
                    {new Date(item.audit.createdAt).toLocaleTimeString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.actor ? (
                    <>
                      <div className="font-medium text-slate-900">{item.actor.name}</div>
                      <div className="text-[10px] text-slate-500">{item.actor.email}</div>
                    </>
                  ) : (
                    <span className="text-xs italic text-slate-400">System</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadgeColor(item.audit.actorRole)}`}>
                    {item.audit.actorRole?.replace("RESTAURANT_", "")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    {item.audit.module ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${actionBadgeColor(item.audit.action)}`}>
                    {item.audit.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">{item.audit.entityType}</div>
                  <div className="font-mono text-[10px] text-slate-400">{item.audit.entityPublicId ?? "—"}</div>
                </td>
                <td className="px-4 py-3">
                  {item.restaurant ? (
                    <>
                      <div className="max-w-[120px] truncate font-medium text-slate-800">{item.restaurant.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.restaurant.publicId}</div>
                    </>
                  ) : (
                    <span className="text-xs italic text-slate-400">Platform</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.audit.requestId ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                      {item.audit.requestId.substring(0, 16)}…
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <AuditDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
