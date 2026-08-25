"use client";

import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { superAdminApi } from "@/lib/api/super-admin.api";
import toast from "react-hot-toast";

type SettingsData = {
  platformName?: string;
  supportEmail?: string;
  supportPhone?: string;
  defaultCurrency?: string;
  defaultTimezone?: string;
  licenseWarningDays?: number;
  defaultMonthlyPrice?: number;
  defaultYearlyPrice?: number;
  maintenanceMode?: boolean;
  [key: string]: string | number | boolean | undefined;
};

export function SettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({});

  useEffect(() => {
    superAdminApi.getSettings()
      .then((data) => {
        setSettings(data || {});
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load settings.");
        setLoading(false);
      });
  }, []);

  const handleChange = (key: keyof SettingsData, value: string | boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await superAdminApi.updateSettings({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        defaultCurrency: settings.defaultCurrency,
        defaultTimezone: settings.defaultTimezone,
        licenseWarningDays: Number(settings.licenseWarningDays) || 7,
        defaultMonthlyPrice: Number(settings.defaultMonthlyPrice) || 0,
        defaultYearlyPrice: Number(settings.defaultYearlyPrice) || 0,
        maintenanceMode: settings.maintenanceMode,
      });
      toast.success("Settings saved successfully.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="border bg-white shadow-sm rounded-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold leading-none tracking-tight">General Information</h3>
          <p className="text-sm text-gray-500 mt-1">Configure the basic information of the platform.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none" htmlFor="platformName">Platform Name</label>
            <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" id="platformName" value={settings.platformName || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("platformName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none" htmlFor="supportEmail">Support Email</label>
              <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" id="supportEmail" type="email" value={settings.supportEmail || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("supportEmail", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none" htmlFor="supportPhone">Support Phone</label>
              <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" id="supportPhone" type="tel" value={settings.supportPhone || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("supportPhone", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="border bg-white shadow-sm rounded-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Regional Defaults</h3>
          <p className="text-sm text-gray-500 mt-1">Default settings for new restaurants.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none" htmlFor="defaultCurrency">Default Currency</label>
              <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" id="defaultCurrency" value={settings.defaultCurrency || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("defaultCurrency", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none" htmlFor="defaultTimezone">Default Timezone</label>
              <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" id="defaultTimezone" value={settings.defaultTimezone || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("defaultTimezone", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="border bg-white shadow-sm rounded-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Billing & Licensing</h3>
          <p className="text-sm text-gray-500 mt-1">Configure default pricing and license alerts.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none" htmlFor="licenseWarningDays">License Expiry Warning (Days)</label>
            <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" id="licenseWarningDays" type="number" value={settings.licenseWarningDays || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("licenseWarningDays", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none" htmlFor="defaultMonthlyPrice">Default Monthly Price</label>
              <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" id="defaultMonthlyPrice" type="number" step="0.01" value={settings.defaultMonthlyPrice || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("defaultMonthlyPrice", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none" htmlFor="defaultYearlyPrice">Default Yearly Price</label>
              <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" id="defaultYearlyPrice" type="number" step="0.01" value={settings.defaultYearlyPrice || ""} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("defaultYearlyPrice", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="border border-red-200 bg-white shadow-sm rounded-xl">
        <div className="p-6 border-b border-red-100">
          <h3 className="text-lg font-semibold leading-none tracking-tight text-red-600">Danger Zone</h3>
          <p className="text-sm text-gray-500 mt-1">Critical platform controls.</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-base font-medium">Maintenance Mode</label>
              <p className="text-sm text-gray-500">
                When enabled, all restaurants and admins will see a maintenance screen.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={!!settings.maintenanceMode} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("maintenanceMode", e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
