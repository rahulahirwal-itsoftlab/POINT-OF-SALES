/**
 * Request Logger Middleware — Access Log
 *
 * This is a PURE ACCESS LOG. Its ONLY job is:
 *   - Record that a request arrived
 *   - Record timing (durationMs) when it completes
 *   - Warn when a request is unusually slow
 *
 * IMPORTANT — Why this always logs at INFO (not WARN/ERROR for 4xx/5xx):
 * -----------------------------------------------------------------------
 * error.middleware.ts already logs every error with the correct severity
 * (WARN for 401/403, ERROR for 5xx) along with errorCode and errorMessage.
 * If this middleware ALSO branches on statusCode, every error produces TWO
 * log entries with the same requestId — one from error.middleware, one here.
 * That is double-logging and it pollutes structured log queries.
 *
 * Rule: error classification lives in error.middleware.ts ONLY.
 *       This file emits one INFO access-log line per request, always.
 *
 * The only exception is SLOW_REQUEST — that is a performance signal
 * that error.middleware does NOT emit, so it belongs here.
 */

import type { MiddlewareHandler } from "hono";
import { logger } from "../common/logger/logger.js";
import { env } from "../config/env.js";

export const requestLoggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const method = c.req.method.toUpperCase();
  const path = new URL(c.req.url).pathname;
  const requestId = c.get("requestId") as string | undefined;

  // Log incoming request at DEBUG level — noisy in production
  logger.debug({ requestId, method, path }, `>> ${method} ${path}`);

  await next();

  const durationMs = Date.now() - start;
  const statusCode = c.res.status;

  const logData = {
    requestId,
    method,
    path,
    statusCode,
    durationMs,
  };

  // SLOW REQUEST: performance warning — distinct from any error log
  if (durationMs > env.SLOW_REQUEST_THRESHOLD_MS) {
    logger.warn(
      { ...logData, threshold: env.SLOW_REQUEST_THRESHOLD_MS },
      `SLOW_REQUEST: ${method} ${path} took ${durationMs}ms (limit: ${env.SLOW_REQUEST_THRESHOLD_MS}ms)`
    );
    return;
  }

  // ACCESS LOG: always INFO — error classification is error.middleware's job.
  // Using ASCII "<<" instead of Unicode arrow to avoid Windows console encoding issues.
  logger.info(logData, `<< ${method} ${path} ${statusCode} (${durationMs}ms)`);
};
