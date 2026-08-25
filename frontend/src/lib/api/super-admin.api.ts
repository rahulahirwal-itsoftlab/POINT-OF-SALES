import { apiClient } from "./client";

type QueryParams = Record<string, string | number | boolean | undefined>;
type RequestBody = Record<string, unknown>;

export const superAdminApi = {
  // Dashboard
  getDashboardOverview: () => apiClient.get("/super-admin/dashboard").then(res => res.data.data),

  // Restaurants
  listRestaurants: (params?: QueryParams) => apiClient.get("/super-admin/restaurants", { params }).then(res => res.data),
  getRestaurant: (id: string) => apiClient.get(`/super-admin/restaurants/${id}`).then(res => res.data.data),
  createRestaurant: (data: RequestBody) => apiClient.post("/super-admin/restaurants", data).then(res => res.data.data),
  updateRestaurant: (id: string, data: RequestBody) => apiClient.patch(`/super-admin/restaurants/${id}`, data).then(res => res.data.data),
  activateRestaurant: (id: string) => apiClient.patch(`/super-admin/restaurants/${id}/activate`).then(res => res.data.data),
  deactivateRestaurant: (id: string) => apiClient.patch(`/super-admin/restaurants/${id}/deactivate`).then(res => res.data.data),
  blockRestaurant: (id: string) => apiClient.patch(`/super-admin/restaurants/${id}/block`).then(res => res.data.data),
  unblockRestaurant: (id: string) => apiClient.patch(`/super-admin/restaurants/${id}/unblock`).then(res => res.data.data),

  // Revenue
  getRevenueOverview: () => apiClient.get("/super-admin/revenue").then(res => res.data.data),
  getMonthlyRevenue: () => apiClient.get("/super-admin/revenue/monthly").then(res => res.data.data),
  getYearlyRevenue: () => apiClient.get("/super-admin/revenue/yearly").then(res => res.data.data),

  // Plans
  listPlans: (params?: QueryParams) => apiClient.get("/super-admin/plans", { params }).then(res => res.data),

  // Subscriptions
  listSubscriptions: (params?: QueryParams) => apiClient.get("/super-admin/subscriptions", { params }).then(res => res.data),
  getSubscription: (id: string) => apiClient.get(`/super-admin/subscriptions/${id}`).then(res => res.data.data),
  createSubscription: (data: RequestBody) => apiClient.post("/super-admin/subscriptions", data).then(res => res.data.data),
  renewSubscription: (id: string, data: RequestBody) => apiClient.post(`/super-admin/subscriptions/${id}/renew`, data).then(res => res.data.data),
  suspendSubscription: (id: string, data: RequestBody) => apiClient.post(`/super-admin/subscriptions/${id}/suspend`, data).then(res => res.data.data),
  cancelSubscription: (id: string, data: RequestBody) => apiClient.post(`/super-admin/subscriptions/${id}/cancel`, data).then(res => res.data.data),
  reactivateSubscription: (id: string) => apiClient.post(`/super-admin/subscriptions/${id}/reactivate`).then(res => res.data.data),

  // Licenses
  listLicenses: (params?: QueryParams) => apiClient.get("/super-admin/licenses", { params }).then(res => res.data.data),
  getLicense: (id: string) => apiClient.get(`/super-admin/licenses/${id}`).then(res => res.data.data),
  activateLicense: (id: string) => apiClient.post(`/super-admin/licenses/${id}/activate`).then(res => res.data.data),
  suspendLicense: (id: string) => apiClient.post(`/super-admin/licenses/${id}/suspend`).then(res => res.data.data),
  revokeLicense: (id: string) => apiClient.post(`/super-admin/licenses/${id}/revoke`).then(res => res.data.data),
  triggerBulkExpiry: () => apiClient.post("/super-admin/licenses/trigger-expiry").then(res => res.data.data),

  // Audit Logs
  listAuditLogs: (params?: QueryParams) => apiClient.get("/super-admin/audit-logs", { params }).then(res => res.data),
  getAuditLog: (id: string) => apiClient.get(`/super-admin/audit-logs/${id}`).then(res => res.data.data),
  getAuditLogFilters: () => apiClient.get("/super-admin/audit-logs/filters").then(res => res.data.data),

  // Notifications
  listNotifications: (params?: QueryParams) => apiClient.get("/super-admin/notifications", { params }).then(res => res.data),
  getNotification: (id: string) => apiClient.get(`/super-admin/notifications/${id}`).then(res => res.data.data),
  markNotificationRead: (id: string) => apiClient.patch(`/super-admin/notifications/${id}/read`).then(res => res.data.data),
  markAllNotificationsRead: (params?: QueryParams) => apiClient.patch("/super-admin/notifications/read-all", undefined, { params }).then(res => res.data.data),

  // Settings
  getSettings: () => apiClient.get("/super-admin/settings").then(res => res.data.data),
  updateSettings: (data: RequestBody) => apiClient.patch("/super-admin/settings", data).then(res => res.data.data),

  // Profile
  getProfile: () => apiClient.get("/super-admin/profile").then(res => res.data.data),
};
