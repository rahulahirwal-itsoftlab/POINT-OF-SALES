import { apiClient } from "@/lib/api/client";
import type { DashboardDateQueryParams } from "@/lib/dashboard/date-filter";

export type StaffDashboard = {
  orders: { todayOrders: number; pendingOrders: number; completedOrders: number; readyOrders: number };
  bills: { todayBills: number; todaySales: number; paidBills: number; pendingBills: number };
  staff: { active: number };
  menu: { total: number };
  tables: { active: number; available: number; occupied: number };
  recentOrders: OrderRow[];
  recentBills: BillRow[];
  dateRange?: { preset: string; startDate: string; endDate: string; timezone: string; grouping: string };
};

export type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  tableId?: string | null;
  table?: string | null;
  customerId?: string | null;
  customer?: string | null;
  customerPhone?: string | null;
  waiter?: string | null;
  itemCount?: number;
  createdAt: string;
};

export type BillRow = {
  id: string;
  billNumber: string;
  orderNumber: string;
  grandTotal: number;
  paymentStatus: string;
  table?: string | null;
  customer?: string | null;
  customerPhone?: string | null;
  waiter?: string | null;
  createdAt: string;
};

export type BillDetail = BillRow & {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  paidAmount: number;
  remainingAmount: number;
  orderId: string;
  orderStatus: string;
  tableId?: string | null;
  customerId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  waiter?: string | null;
  restaurantName?: string | null;
  restaurantLegalName?: string | null;
  restaurantAddress?: string | null;
  restaurantAddressLine1?: string | null;
  restaurantAddressLine2?: string | null;
  restaurantCity?: string | null;
  restaurantState?: string | null;
  restaurantCountry?: string | null;
  restaurantPostalCode?: string | null;
  restaurantPhone?: string | null;
  restaurantTaxNumber?: string | null;
  items: Array<{ id: string; itemName: string; itemCode?: string | null; quantity: number; unitPrice: number; discountAmount: number; taxAmount: number; taxRate: number; lineTotal: number; notes?: string | null }>;
  payments: Array<{ id: string; amount: number; method: string; status: string; paidAt?: string | null; createdAt: string }>;
};

export type TableRow = {
  id: string;
  tableNumber: string;
  capacity?: number | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  activeOrderId?: string | null;
  activeOrderNumber?: string | null;
  activeOrderStatus?: string | null;
  activeOrderTotal?: string | number | null;
  activeBillNumber?: string | null;
  activePaymentStatus?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  groupTables?: string[];
};

export type TableDetail = TableRow & {
  activeOrder?: (OrderDetail & { billNumber?: string | null; paymentStatus?: string | null }) | null;
};

export type OrderDetail = OrderRow & {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  tableId?: string | null;
  customerId?: string | null;
  customerPhone?: string | null;
  billNumber?: string | null;
  paymentStatus?: string | null;
  items: Array<{ id: string; itemName: string; menuItemId?: string; unitPrice: number; quantity: number; taxAmount: number; lineTotal: number; notes?: string | null; imageUrl?: string | null; recipeRequirements?: Array<{ inventoryItemName: string; quantity: number; unit: string }> }>;
};

export type CategoryRow = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type MenuRow = {
  item: {
    id: string;
    name: string;
    description?: string | null;
    price: string;
    taxRate: string;
    imageUrl?: string | null;
    imagePublicId?: string | null;
    isAvailable: boolean;
    isActive: boolean;
    createdAt?: string;
  };
  category: { id: string; name: string };
};

export type StaffNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
};

type ApiOne<T> = { data: T };
type ApiList<T> = { data: T[]; meta?: { total?: number; page?: number; limit?: number; unread?: number } };

export async function getStaffDashboard(params?: DashboardDateQueryParams) {
  const response = await apiClient.get<ApiOne<StaffDashboard>>("/staff-pos/dashboard", { params });
  return response.data;
}

export async function getStaffOrders(params?: Record<string, string | number | undefined>) {
  const response = await apiClient.get<ApiList<OrderRow>>("/staff-pos/orders", { params });
  return response.data;
}

export async function getTables() {
  const response = await apiClient.get<ApiOne<TableRow[]>>("/staff-pos/tables");
  return response.data;
}

export async function assignTable(
  tableIdOrInput: string | { tableIds?: string[]; tableId?: string; customerName: string; customerPhone: string; customerEmail?: string; numberOfGuests?: number },
  inputData?: { customerName: string; customerPhone: string; customerEmail?: string; numberOfGuests?: number }
) {
  if (typeof tableIdOrInput === "string") {
    const response = await apiClient.post<ApiOne<{ table: TableRow; customer: { id: string; name: string; phone: string }; order: OrderRow }>>(`/staff-pos/tables/${tableIdOrInput}/assign`, inputData);
    return response.data;
  }
  const response = await apiClient.post<ApiOne<{ table: TableRow; customer: { id: string; name: string; phone: string }; order: OrderRow }>>("/staff-pos/tables/assign", tableIdOrInput);
  return response.data;
}

export async function createTable(input: { tableNumber: string; capacity: number }) {
  const response = await apiClient.post<ApiOne<TableRow>>("/staff-pos/tables", input);
  return response.data;
}

export async function getTableDetail(id: string) {
  const response = await apiClient.get<ApiOne<TableDetail>>(`/staff-pos/tables/${id}`);
  return response.data;
}

export async function updateTable(id: string, input: { tableNumber?: string; capacity?: number; status?: string }) {
  const response = await apiClient.patch<ApiOne<TableRow>>(`/staff-pos/tables/${id}`, input);
  return response.data;
}

export async function deleteTable(id: string) {
  const response = await apiClient.delete<ApiOne<TableRow>>(`/staff-pos/tables/${id}`);
  return response.data;
}

export async function createOrder(input: { tableId?: string; customerId?: string; notes?: string; items: Array<{ menuItemId: string; quantity: number; notes?: string }> }) {
  const response = await apiClient.post<ApiOne<OrderRow>>("/staff-pos/orders", input);
  return response.data;
}

export async function getOrderDetail(id: string) {
  const response = await apiClient.get<ApiOne<OrderDetail>>(`/staff-pos/orders/${id}`);
  return response.data;
}

export async function addOrderItems(id: string, input: { items: Array<{ menuItemId: string; quantity: number; notes?: string }> }) {
  const response = await apiClient.post<ApiOne<OrderRow>>(`/staff-pos/orders/${id}/items`, input);
  return response.data;
}

export async function serveOrder(id: string) {
  const response = await apiClient.post<ApiOne<OrderRow>>(`/staff-pos/orders/${id}/serve`);
  return response.data;
}

export async function sendOrderToBilling(id: string) {
  const response = await apiClient.post<ApiOne<BillRow>>(`/staff-pos/orders/${id}/send-to-billing`);
  return response.data;
}

export async function getKitchenOrders() {
  const response = await apiClient.get<ApiList<OrderRow>>("/staff-pos/kitchen/orders", { params: { limit: 100 } });
  return response.data;
}

export async function updateKitchenOrderStatus(id: string, status: string) {
  const response = await apiClient.patch<ApiOne<OrderRow>>(`/staff-pos/kitchen/orders/${id}/status`, { status });
  return response.data;
}

export async function getStaffBills(params?: Record<string, string | number | undefined>) {
  const response = await apiClient.get<ApiList<BillRow>>("/staff-pos/bills", { params });
  return response.data;
}

export async function getStaffBillDetail(id: string) {
  const response = await apiClient.get<ApiOne<BillDetail>>(`/staff-pos/bills/${id}`);
  return response.data;
}

export async function getStaffNotifications(params?: Record<string, string | number | undefined>) {
  const response = await apiClient.get<ApiList<StaffNotification>>("/staff-pos/notifications", { params });
  return response.data;
}

export async function readStaffNotification(id: string) {
  const response = await apiClient.patch<ApiOne<StaffNotification>>(`/staff-pos/notifications/${id}/read`);
  return response.data;
}

export async function readAllStaffNotifications() {
  const response = await apiClient.patch<ApiOne<{ count: boolean }>>("/staff-pos/notifications/read-all");
  return response.data;
}

export async function payBill(id: string, input: { amount: number; method: string }) {
  const response = await apiClient.patch<ApiOne<BillRow>>(`/staff-pos/bills/${id}/payment`, input);
  return response.data;
}

export async function getCategories() {
  const response = await apiClient.get<ApiList<CategoryRow>>("/staff-pos/menu/categories");
  return response.data;
}

export async function createCategory(input: { name: string; description?: string }) {
  const response = await apiClient.post("/staff-pos/menu/categories", input);
  return response.data;
}

export async function getMenu() {
  const response = await apiClient.get<ApiList<MenuRow>>("/staff-pos/menu");
  return response.data;
}

export async function createMenuItem(input: {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  taxRate?: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  isAvailable?: boolean;
}) {
  const response = await apiClient.post("/staff-pos/menu", input);
  return response.data;
}

export async function updateMenuItem(
  id: string,
  input: {
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    taxRate?: number;
    imageUrl?: string | null;
    imagePublicId?: string | null;
    isAvailable?: boolean;
    isActive?: boolean;
  }
) {
  const response = await apiClient.patch(`/staff-pos/menu/${id}`, input);
  return response.data;
}

export async function deleteMenuItem(id: string) {
  const response = await apiClient.delete(`/staff-pos/menu/${id}`);
  return response.data;
}

export async function uploadMenuImage(file: File) {
  const form = new FormData();
  form.set("file", file);
  const response = await apiClient.post<ApiOne<{ imageUrl: string; imagePublicId: string }>>("/staff-pos/uploads/menu-image", form);
  return response.data;
}
