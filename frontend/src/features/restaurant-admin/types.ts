export type StaffRole = "WAITER" | "RECEPTION" | "KITCHEN";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED";

export type RestaurantAdminDashboard = {
  revenue: { today: number; week: number; month: number; selected?: number; averageOrderValue?: number };
  orders: { today: number; week: number; month: number; total: number; selected?: number };
  bills: { total: number; paid: number; pending: number; cancelled: number };
  staff: { total: number; receptionists: number; waiters: number; kitchenStaff: number; active: number; inactive: number };
  subscription: { planName: string; status: string; remainingDays: number; endDate: string } | null;
  license: { status: string; remainingDays: number; expiresAt: string; licenseKey: string } | null;
  charts: {
    revenueTrend: Array<{ date: string; revenue: number }>;
    orderTrend: Array<{ date: string; orders: number }>;
    paymentDistribution: Array<{ method: string; total: number; count: number }>;
    staffDistribution: Array<{ role: string; count: number }>;
  };
  dateRange?: { preset: string; startDate: string; endDate: string; timezone: string; grouping: string };
};

export type StaffMember = {
  id: string;
  publicId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: StaffRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string | null;
  shift?: string | null;
  assignedSection?: string | null;
  kitchenStation?: string | null;
};

export type StaffMemberDetail = StaffMember & {
  organizationId?: string;
  restaurantId?: string;
  updatedAt?: string;
};

export type UpdateStaffInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
  employeeCode?: string;
  shift?: string;
  assignedSection?: string;
  kitchenStation?: string;
};

export type BillRow = {
  id: string;
  billNumber: string;
  orderNumber: string;
  table?: string | null;
  customer?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  orderStatus: string;
  createdBy?: string | null;
  createdAt: string;
};

export type SubscriptionDetails = {
  planName: string;
  planType: "PREDEFINED" | "CUSTOMIZED";
  billingCycle: string;
  standardPrice: number;
  customPrice: number | null;
  basePrice: number;
  gstPercentage: number;
  gstAmount: number;
  finalPrice: number;
  currency: string;
  waiterLimit: number | null;
  kitchenLimit: number | null;
  receptionistLimit: number | null;
  durationMonths: number | null;
  staffLimit: number | null;
  usedStaff: number;
  remainingStaff: number | null;
  roleUsage?: {
    waiters: { used: number; limit: number | null; remaining: number | null };
    kitchen: { used: number; limit: number | null; remaining: number | null };
    receptionists: { used: number; limit: number | null; remaining: number | null };
  };
  status: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  remainingDays: number;
  licenseStatus: string;
  licenseKey: string;
};

export type AuditLog = {
  id: string;
  actorRole: string;
  module: string;
  action: string;
  description?: string | null;
  entityType: string;
  ipAddress?: string | null;
  createdAt: string;
};

export type RestaurantNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
};
