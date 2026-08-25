/**
 * AppError — Base class for all application-level errors.
 *
 * Design:
 * - `message`: The INTERNAL message — goes to logs, never to clients
 * - `safeMessage`: What the frontend sees — always safe, never exposes internals
 * - `code`: Machine-readable error code (e.g., "ADMIN_NOT_FOUND", "LICENSE_EXPIRED")
 * - `statusCode`: HTTP status code
 * - `details`: Optional structured details (e.g., Zod validation errors)
 * - `cause`: The original underlying error (for internal logging only)
 *
 * The error handler middleware (error.middleware.ts) uses safeMessage when
 * responding to the client, and logs the full message + stack internally.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
    public readonly details?: unknown,
    /** Safe message shown to end users — falls back to message if not provided */
    public readonly safeMessage?: string,
    /** Original error that caused this (for internal logging) */
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
    // Ensures proper prototype chain for `instanceof` checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
