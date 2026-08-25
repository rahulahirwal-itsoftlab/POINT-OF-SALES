export type SuperAdminDashboard = {
  organizations: {
    total: number;
    active: number;
    inactive: number;
    blocked: number;
    new?: number;
  };
  admins: {
    total: number;
    active: number;
    blocked: number;
    inactive: number;
  };
  subscriptions: {
    active: number;
    expired: number;
    expiringSoon: number;
    monthly: number;
    yearly: number;
    selected?: number;
  };
  licenses: {
    active: number;
    expired: number;
    expiringSoon: number;
  };
  revenue: {
    total: number;
    monthly: number;
    yearly: number;
  };
  notifications: {
    unread: number;
  };
  dateRange?: {
    preset: string;
    startDate: string;
    endDate: string;
    timezone: string;
    grouping: string;
  };
};
