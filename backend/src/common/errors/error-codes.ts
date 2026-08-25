/**
 * Centralized error factory functions.
 *
 * Each function returns an AppError with:
 * - A specific error code
 * - A safe user-facing message (safeMessage)
 * - An appropriate HTTP status code
 *
 * Using factories instead of raw `new AppError(...)` throughout the codebase
 * ensures consistent error codes, status codes, and user-facing messages.
 *
 * Usage:
 *   throw Errors.notFound("Admin not found", "ADMIN_NOT_FOUND");
 *   throw Errors.licenseExpired();
 *   throw Errors.unauthorized("Session expired");
 */

import { AppError } from "./app-error.js";

export const Errors = {
  // 400 — Bad Request / Validation
  badRequest: (message: string, code = "BAD_REQUEST", details?: unknown) =>
    new AppError(message, 400, code, details, "The request could not be processed. Please check your input."),

  validation: (message: string, details?: unknown) =>
    new AppError(message, 422, "VALIDATION_ERROR", details, "Request validation failed. Please check the provided data."),

  // 401 — Authentication
  unauthorized: (message = "Authentication required", code = "AUTHENTICATION_REQUIRED") =>
    new AppError(message, 401, code, undefined, "Authentication required. Please log in."),

  invalidCredentials: () =>
    new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS", undefined, "Invalid email or password."),

  sessionExpired: () =>
    new AppError("Session expired", 401, "SESSION_EXPIRED", undefined, "Your session has expired. Please log in again."),

  // 403 — Authorization / Business Rules
  forbidden: (message = "Access denied", code = "FORBIDDEN") =>
    new AppError(message, 403, code, undefined, "You do not have permission to perform this action."),

  roleForbidden: (requiredRole: string) =>
    new AppError(`Role ${requiredRole} required`, 403, "FORBIDDEN", undefined, "You do not have permission to perform this action."),

  userBlocked: () =>
    new AppError("User account is blocked", 403, "ACCOUNT_BLOCKED", undefined, "Your account has been blocked. Please contact the administrator."),

  userInactive: () =>
    new AppError("User account is not active", 403, "ACCOUNT_INACTIVE", undefined, "Your account is not active. Please contact support."),

  accountNotActivated: () =>
    new AppError("Account not active", 403, "ACCOUNT_NOT_ACTIVATED", undefined, "Account is not active. Please contact your platform administrator."),

  licenseExpired: () =>
    new AppError("License expired", 403, "LICENSE_EXPIRED", undefined, "Your subscription has expired. Please contact the administrator."),

  licenseMissing: () =>
    new AppError("No active license found", 403, "LICENSE_MISSING", undefined, "No active license found for this restaurant. Please contact the administrator."),

  licenseSuspended: () =>
    new AppError("License suspended", 403, "LICENSE_SUSPENDED", undefined, "Your account access has been suspended. Please contact support."),

  licenseBlocked: () =>
    new AppError("License blocked", 403, "LICENSE_BLOCKED", undefined, "Your POS access has been blocked. Please contact the administrator."),

  licenseRevoked: () =>
    new AppError("License revoked", 403, "LICENSE_REVOKED", undefined, "Your license has been permanently revoked."),

  licenseInactive: () =>
    new AppError("License inactive", 403, "LICENSE_INACTIVE", undefined, "Your license is not active. Please contact the administrator."),

  restaurantMissing: () =>
    new AppError("Restaurant context missing", 403, "RESTAURANT_MISSING", undefined, "Restaurant context could not be resolved."),

  csrfForbidden: () =>
    new AppError("Request origin not allowed", 403, "CSRF_ORIGIN_FORBIDDEN", undefined, "Request blocked for security reasons."),

  // 404 — Not Found
  notFound: (resource: string, code?: string) =>
    new AppError(`${resource} not found`, 404, code ?? "NOT_FOUND", undefined, `${resource} could not be found.`),

  // 409 — Conflict
  conflict: (message: string, code = "CONFLICT") =>
    new AppError(message, 409, code, undefined, "A conflict occurred. The resource may already exist."),

  emailAlreadyExists: () =>
    new AppError("Email already exists", 409, "EMAIL_ALREADY_EXISTS", undefined, "An account with this email address already exists."),

  // 429 — Rate Limit
  rateLimited: () =>
    new AppError("Too many requests", 429, "RATE_LIMIT_EXCEEDED", undefined, "Too many requests. Please wait a moment before trying again."),

  // 500 — Internal / Database
  internal: (message = "Unexpected server error", cause?: unknown) =>
    new AppError(message, 500, "INTERNAL_ERROR", undefined, "An unexpected error occurred. Please try again later.", cause),

  database: (message: string, cause?: unknown) =>
    new AppError(message, 500, "DATABASE_ERROR", undefined, "A database error occurred. Please try again later.", cause),
};
