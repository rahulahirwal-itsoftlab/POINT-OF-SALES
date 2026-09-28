"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Edit2,
  Loader2,
  Mail,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import {
  useCreateSuperAdmin,
  useSuperAdmins,
  useToggleSuperAdminStatus,
  useUpdateSuperAdmin,
} from "@/features/franchise-admin/hooks";
import type { SuperAdminInput, SuperAdminListItem } from "@/features/franchise-admin/api";
import { extractApiError } from "@/lib/api/client";

export default function SuperAdminsPage() {
  const { data: superAdmins = [], isLoading, isError, refetch } = useSuperAdmins();
  const createMutation = useCreateSuperAdmin();
  const updateMutation = useUpdateSuperAdmin();
  const statusMutation = useToggleSuperAdminStatus();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SuperAdminListItem | null>(null);

  const [addForm, setAddForm] = useState<SuperAdminInput>({
    name: "",
    email: "",
    phone: "",
    password: "",
    status: "ACTIVE",
  });
  const [addError, setAddError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<{
    name: string;
    phone: string;
    status: "ACTIVE" | "INACTIVE";
  }>({
    name: "",
    phone: "",
    status: "ACTIVE",
  });
  const [editError, setEditError] = useState<string | null>(null);

  const filteredAdmins = superAdmins.filter(
    (sa) =>
      sa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sa.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sa.phone && sa.phone.includes(searchTerm)),
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addForm.name || !addForm.email || !addForm.password) {
      setAddError("Full Name, Email, and Password are required.");
      return;
    }
    try {
      await createMutation.mutateAsync(addForm);
      setIsAddModalOpen(false);
      setAddForm({ name: "", email: "", phone: "", password: "", status: "ACTIVE" });
    } catch (err) {
      const parsed = extractApiError(err);
      setAddError(parsed.message);
    }
  };

  const handleEditOpen = (admin: SuperAdminListItem) => {
    setEditingAdmin(admin);
    setEditForm({ name: admin.name, phone: admin.phone || "", status: admin.status });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditError(null);
    try {
      await updateMutation.mutateAsync({ id: editingAdmin.id, data: editForm });
      setEditingAdmin(null);
    } catch (err) {
      const parsed = extractApiError(err);
      setEditError(parsed.message);
    }
  };

  const handleToggleStatus = async (admin: SuperAdminListItem) => {
    const newStatus = admin.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await statusMutation.mutateAsync({ id: admin.id, status: newStatus });
    } catch (err) {
      const parsed = extractApiError(err);
      alert(`Status update failed: ${parsed.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Super Admin Management
          </h1>
          <p className="text-xs text-slate-500">
            Dynamically create, update, and manage Super Admin accounts for your franchise.
          </p>
        </div>
        <button
          onClick={() => {
            setAddError(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          Add Super Admin
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Users className="h-4 w-4 text-amber-600" />
          <span>{filteredAdmins.length} Super Admins</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
            <span>Loading Super Admins...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-lg font-bold">Failed to load Super Admins</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center">
          <div className="rounded-full bg-amber-50 p-4 text-amber-600">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">No Super Admins Found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            {searchTerm
              ? "No Super Admins matched your search criteria."
              : "No Super Admins have been created for this franchise yet. Click below to add one."}
          </p>
          {!searchTerm ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              Add First Super Admin
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/50 uppercase tracking-wider font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">Super Admin</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 font-extrabold text-amber-800">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{admin.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 font-normal">
                            {admin.publicId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {admin.email}
                        </span>
                        {admin.phone ? (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {admin.phone}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {admin.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          <UserCheck className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                          <UserX className="h-3 w-3" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditOpen(admin)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit Super Admin"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          disabled={statusMutation.isPending}
                          className={`rounded-lg p-2 transition ${
                            admin.status === "ACTIVE"
                              ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                              : "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                          title={admin.status === "ACTIVE" ? "Deactivate Super Admin" : "Activate Super Admin"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Super Admin Modal */}
      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Super Admin</h3>
                  <p className="text-xs text-slate-500">Create a new Super Admin for your franchise.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 p-6">
              {addError ? (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{addError}</div>
              ) : null}
              <div>
                <label className="block text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.superadmin@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create Super Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Super Admin Modal */}
      {editingAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Super Admin</h3>
                  <p className="text-xs text-slate-500">{editingAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 p-6">
              {editError ? (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{editError}</div>
              ) : null}
              <div>
                <label className="block text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Account Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Deactivated</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
