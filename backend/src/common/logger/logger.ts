import pino from "pino";
import { env } from "../../config/env.js";
import { getLoggerContext } from "./logger.context.js";

export const logger = pino({
  level: env.LOG_LEVEL,

  /**
   * Mixin — appended to every log entry automatically.
   *
   * IMPORTANT: Always destructure only the KNOWN LogContext fields.
   * Never return the raw context object (`return context`) because:
   * 1. Pino merges the mixin result into every log entry.
   * 2. If any unknown field is added to the ALS store (even accidentally),
   *    it would silently bleed into EVERY subsequent log call in that request.
   * 3. Destructuring creates a clean copy — unknown fields are dropped.
   */
  mixin() {
    const ctx = getLoggerContext();
    if (!ctx) return {};
    // Explicitly enumerate every allowed mixin field.
    // This is the authoritative list — add new fields here when LogContext grows.
    const result: Record<string, unknown> = {};
    if (ctx.requestId !== undefined)   result["requestId"]   = ctx.requestId;
    if (ctx.principalId !== undefined) result["principalId"] = ctx.principalId;
    if (ctx.role !== undefined)        result["role"]        = ctx.role;
    if (ctx.restaurantId !== undefined) result["restaurantId"] = ctx.restaurantId;
    if (ctx.module !== undefined)      result["module"]      = ctx.module;
    return result;
  },

  /**
   * mixinMergeStrategy: "spread" (the default) means inline log fields WIN
   * over mixin fields when both have the same key (e.g. `requestId`).
   * This is correct — the caller's explicit fields should always take precedence.
   */
  mixinMergeStrategy(mergeObject, mixinObject) {
    return Object.assign(mixinObject, mergeObject);
  },

  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },

  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "secret",
      "apiKey",
      "clientSecret",
      "privateKey",
      "cardNumber",
      "cvv",
      "*.password",
      "*.token",
      "*.authorization",
      "*.refreshToken",
      "*.jwt",
      "*.cookie",
    ],
    censor: "[REDACTED]",
  },
});
