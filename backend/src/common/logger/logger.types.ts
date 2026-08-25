/**
 * Centralized logger types for structured, JSON-based application logging.
 * These are APPLICATION log types — not audit log types.
 * 
 * APPLICATION LOGS: for developers & ops (debug, info, warn, error, fatal)
 * AUDIT LOGS: for business/security history — see common/audit/audit.types.ts
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface BaseLogContext {
  /** Correlation ID for the entire request lifecycle */
  requestId?: string;
  /** Internal UUID of the authenticated user */
  principalId?: string;
  /** Role of the authenticated user */
  role?: string;
  /** Organization UUID (tenant boundary) */
  organizationId?: string;
  /** Restaurant UUID (multi-tenant context) */
  restaurantId?: string;
  /** The feature module originating this log (e.g., "AUTH", "ORDERS") */
  module?: string;
}

export interface HttpLogContext extends BaseLogContext {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}

export interface ErrorLogContext extends BaseLogContext {
  errorCode?: string;
  errorName?: string;
  /** Safe, sanitized error message (no stack/SQL) */
  errorMessage?: string;
  /** Internal stack trace — only written to stdout, never returned to client */
  stack?: string;
}

export interface DatabaseLogContext extends BaseLogContext {
  operation?: string;
  table?: string;
  durationMs?: number;
  errorCode?: string;
}
