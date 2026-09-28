import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "FRANCHISE_STEWARD",
  "SUPER_ADMIN",
  "ADMIN",
  "RESTAURANT_ADMIN",
  "WAITER",
  "KITCHEN",
  "RECEPTION",
]);

export const employeeRoleEnum = pgEnum("employee_role", [
  "WAITER",
  "RECEPTION",
  "KITCHEN",
]);

export const authSubjectTypeEnum = pgEnum("auth_subject_type", [
  "FRANCHISE_STEWARD",
  "SUPER_ADMIN",
  "ADMIN",
  "EMPLOYEE",
]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "BLOCKED",
  "INACTIVE",
  "ARCHIVED",
  "INVITED",
]);

export const restaurantStatusEnum = pgEnum("restaurant_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "BLOCKED",
  "ARCHIVED",
]);

export const organizationStatusEnum = pgEnum("organization_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "BLOCKED",
  "ARCHIVED",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "TRIAL",
  "EXPIRED",
  "CANCELLED",
  "SUSPENDED",
  "PENDING",
]);

export const licenseStatusEnum = pgEnum("license_status", [
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
  "BLOCKED",
  "CANCELLED",
  "REVOKED",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "DRAFT",
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
  "CANCELLED",
]);

export const tableStatusEnum = pgEnum("table_status", [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
  "OUT_OF_SERVICE",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_PAID",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "UPI",
  "CARD",
  "NET_BANKING",
  "OTHER",
]);

export const loginActivityStatusEnum = pgEnum("login_activity_status", [
  "SUCCESS",
  "FAILED",
  "BLOCKED",
  "LOGOUT",
]);

export const notificationScopeEnum = pgEnum("notification_scope", [
  "SYSTEM",
  "RESTAURANT",
  "USER",
]);
