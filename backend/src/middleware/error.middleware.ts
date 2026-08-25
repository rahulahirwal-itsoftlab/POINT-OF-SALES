/**
 * Centralized Error Handler Middleware
 *
 * This is the SINGLE place where ALL errors are caught, logged, and
 * converted into safe API responses.
 *
 * Design:
 * - AppError: Use safeMessage for client response; log internal message + stack
 * - ZodError: Return structured validation details; log at WARN level
 * - Unknown errors: Always return generic "Unexpected error" to client;
 *                   log the full error internally
 * - requestId is ALWAYS included in the response for client-side tracing
 * - Stack traces NEVER reach the client
 *
 * Response contract:
 * {
 *   success: false,
 *   error: {
 *     code: "MACHINE_READABLE_CODE",
 *     message: "Safe user-facing message",
 *     requestId: "req_xxx"  // Always present for tracing
 *   }
 * }
 */

import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { AppError } from "../common/errors/app-error.js";
import { logger } from "../common/logger/logger.js";

export const errorHandler: ErrorHandler = (error, c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
  const method = c.req.method.toUpperCase();
  const path = new URL(c.req.url).pathname;

  const requestOrigin = c.req.header("origin");
  if (requestOrigin) {
    c.header("Access-Control-Allow-Origin", requestOrigin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Headers", "Content-Type, X-Restaurant-Id, X-Request-ID, Authorization");
  }

  // --- Zod Validation Errors ---
  if (error instanceof ZodError) {
    const issueSummary = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    const safeMessage = issueSummary ? `Validation failed: ${issueSummary}` : "Request validation failed. Please check the provided data.";

    logger.warn(
      { requestId, method, path, statusCode: 422, errorCode: "VALIDATION_ERROR", issues: error.issues },
      "Request validation failed"
    );
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: safeMessage,
          details: error.flatten(),
          requestId,
        },
      },
      422
    );
  }

  // --- Application Errors (AppError) ---
  if (error instanceof AppError) {
    const status = error.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;
    const logData = {
      requestId,
      method,
      path,
      statusCode: status,
      errorCode: error.code,
      errorMessage: error.message,
    };

    /**
     * Log level strategy — matching the REAL severity of each error:
     *
     * DEBUG  — AUTHENTICATION_REQUIRED on unauthenticated endpoints (/auth/me, etc.)
     *          This is the frontend's passive "am I still logged in?" check.
     *          It fires on every page load for logged-out users. Never a warning.
     *
     * INFO   — Other 401s (SESSION_EXPIRED, ACCOUNT_NOT_ACTIVATED, etc.)
     *          Expected user-facing errors that need visibility but not alerting.
     *
     * WARN   — 403 FORBIDDEN: someone IS authenticated but
     *          attempted an action they have no permission for. Worth alerting on.
     *        — 422 Validation errors: bad client payloads.
     *        — 429 Rate-limited.
     *
     * ERROR  — 5xx: real server-side failures that need immediate attention.
     */
    if (status >= 500) {
      logger.error({ ...logData, stack: error.stack, cause: error.cause }, error.message);
    } else if (error.code === "AUTHENTICATION_REQUIRED") {
      // Passive session check — noisy at WARN, meaningless as an alert
      logger.debug(logData, `${error.code}: ${error.message}`);
    } else if (status === 403) {
      // Authenticated user hitting a permission boundary — worth investigating
      logger.warn(logData, `${error.code}: ${error.message}`);
    } else if (status === 429) {
      logger.warn(logData, `${error.code}: ${error.message}`);
    } else if (status === 422) {
      logger.warn(logData, `${error.code}: ${error.message}`);
    } else {
      // 400, 401 (non AUTHENTICATION_REQUIRED), 404, 409 — expected business errors
      logger.info(logData, `${error.code}: ${error.message}`);
    }

    // Return SAFE message to client — never internal technical details
    const clientMessage =
      error.safeMessage ?? error.message ?? "An error occurred. Please try again.";

    return c.json(
      {
        success: false,
        error: {
          code: error.code,
          message: clientMessage,
          details: error.details,
          requestId,
        },
      },
      status
    );
  }

  // --- Database / Network Connection Errors ---
  const errStr = error instanceof Error ? error.message : String(error);
  if (
    errStr.includes("ENOTFOUND") ||
    errStr.includes("ECONNREFUSED") ||
    errStr.includes("ETIMEDOUT") ||
    errStr.includes("getaddrinfo") ||
    errStr.includes("Connection terminated unexpected")
  ) {
    logger.error(
      { requestId, method, path, statusCode: 503, errorCode: "DATABASE_CONNECTION_ERROR", errorMessage: errStr },
      "Database server connection failure"
    );
    return c.json(
      {
        success: false,
        error: {
          code: "DATABASE_CONNECTION_ERROR",
          message: "Database connection failed. Please check internet connection or database configuration.",
          requestId,
        },
      },
      503
    );
  }

  // --- Unknown / Unhandled Errors ---
  // Log the full error internally — return nothing useful to the client
  logger.error(
    {
      requestId,
      method,
      path,
      statusCode: 500,
      errorCode: "INTERNAL_ERROR",
      stack: error instanceof Error ? error.stack : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    },
    "Unhandled server error"
  );

  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        requestId,
      },
    },
    500
  );
};
