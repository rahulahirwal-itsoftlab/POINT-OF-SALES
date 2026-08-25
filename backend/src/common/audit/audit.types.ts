/**
 * AUDIT LOG TYPES
 *
 * Audit logs are BUSINESS/SECURITY records — distinct from application logs.
 * They answer: who did what, on which record, when, and from which request.
 *
 * These are persisted to the `audit_logs` PostgreSQL table.
 * They are searchable by Super Admin from /super-admin/audit-logs.
 */

export type AuditActorRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "RESTAURANT_ADMIN"
  | "WAITER"
  | "KITCHEN"
  | "RECEPTION";

export type AuditEventInput = {
  /** Correlation request ID — auto-pulled from AsyncLocalStorage if not provided */
  requestId?: string | null;
  /** UUID of the restaurant this event belongs to (multi-tenant isolation) */
  restaurantId?: string | null;
  /** UUID of the super admin who performed the action */
  actorSuperAdminId?: string | null;
  /** UUID of the admin who performed the action */
  actorAdminId?: string | null;
  /** UUID of the employee who performed the action */
  actorEmployeeId?: string | null;
  /** Role of the actor */
  actorRole: AuditActorRole;
  /** Feature module (e.g., "AUTH", "ADMIN", "ORDER") — from LOG_MODULE constants */
  module?: string | null;
  /** Standardized action identifier (e.g., "ADMIN_BLOCKED", "ORDER_CREATED") */
  action: string;
  /** Human-readable description of what happened */
  description?: string | null;
  /** Type of entity affected (e.g., "user", "order", "restaurant") */
  entityType: string;
  /** Internal UUID of the affected entity, when the entity has a stable table row */
  entityId?: string | null;
  /** Public-facing ID of the affected entity (never internal UUID) */
  entityPublicId?: string | null;
  adminId?: string | null;
  subscriptionId?: string | null;
  licenseId?: string | null;
  /** IP address of the actor */
  ipAddress?: string | null;
  /** User agent string */
  userAgent?: string | null;
  /** Safe snapshot of values BEFORE the change (no passwords, tokens, etc.) */
  oldValues?: Record<string, unknown> | null;
  /** Safe snapshot of values AFTER the change */
  newValues?: Record<string, unknown> | null;
  /** Additional structured metadata about the event */
  metadata?: Record<string, unknown> | null;
};
