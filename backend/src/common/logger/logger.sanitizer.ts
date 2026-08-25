/**
 * Centralized log sanitizer.
 * Automatically redacts sensitive fields from any object before it reaches logs.
 * This is a defense-in-depth measure — Pino's built-in redact handles top-level
 * known paths, but this catches arbitrary nested objects passed by developers.
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "hash",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "clientsecret",
  "privatekey",
  "cardnumber",
  "cvv",
  "cvc",
  "sessiontokenhash",
  "jwt",
  "bearertoken",
  "signingkey",
]);

export function sanitize<T>(obj: T, depth = 0): T {
  if (depth > 5) return obj; // Prevent infinite recursion
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitize(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as unknown as T;
}
