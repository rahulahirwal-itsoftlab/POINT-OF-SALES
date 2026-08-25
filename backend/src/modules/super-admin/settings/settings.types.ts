export interface UpdateSettingBody {
  platformName?: string;
  supportEmail?: string;
  supportPhone?: string;
  defaultCurrency?: string;
  defaultTimezone?: string;
  licenseWarningDays?: number;
  defaultMonthlyPrice?: number;
  defaultYearlyPrice?: number;
  maintenanceMode?: boolean;
}
