/**
 * Centralized Frontend Logger
 *
 * This is for CLIENT-SIDE application events only.
 * - UI errors, rendering failures, unhandled rejections, API failures
 * - NOT for business audit events (those happen server-side only)
 *
 * Design:
 * - In production: suppresses debug logs
 * - In development: shows all log levels
 * - NEVER logs passwords, tokens, cookies, or sensitive data
 * - Structured output for searchability
 *
 * Usage:
 *   import { frontendLogger } from "@/lib/logger";
 *   frontendLogger.error({ component: "OrderForm", requestId }, "Order submission failed");
 */

const isDev = process.env.NODE_ENV === "development";

export type FrontendLogContext = {
  component?: string;
  module?: string;
  requestId?: string;
  route?: string;
  statusCode?: number;
  method?: string;
  endpoint?: string;
  errorCode?: string;
  [key: string]: unknown;
};

function formatLog(level: string, context: FrontendLogContext, message: string) {
  return {
    level,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...context,
    message,
  };
}

export const frontendLogger = {
  debug(context: FrontendLogContext, message: string): void {
    if (!isDev) return; // Never log debug in production
    console.debug(formatLog("DEBUG", context, message));
  },

  info(context: FrontendLogContext, message: string): void {
    if (!isDev) return; // Suppress info in production for performance
    console.info(formatLog("INFO", context, message));
  },

  warn(context: FrontendLogContext, message: string): void {
    console.warn(formatLog("WARN", context, message));
  },

  error(context: FrontendLogContext, message: string): void {
    console.error(formatLog("ERROR", context, message));
    // Future: POST to /api/v1/logs/frontend if needed
  },
};
