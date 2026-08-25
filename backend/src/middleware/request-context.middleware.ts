/**
 * Request ID Middleware
 *
 * Every inbound API request gets a unique `requestId` used for full-lifecycle tracing.
 *
 * Strategy:
 * 1. Check if client sent a valid X-Request-ID header (alphanumeric, 8-64 chars)
 *    - If valid: reuse it (allows frontend to correlate its own logs)
 *    - If invalid/missing: generate a new one using Hono's built-in requestId
 * 2. Attach the requestId to the Hono context (`c.set("requestId", ...)`)
 * 3. Populate AsyncLocalStorage so ALL downstream code (services, repositories,
 *    audit service) can access the requestId without prop-drilling
 * 4. Return the requestId in the X-Request-ID response header
 *    so the frontend can display it as a "Reference ID" in error messages
 */

import type { MiddlewareHandler } from "hono";
import { runWithLoggerContext } from "../common/logger/logger.context.js";

const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_\-]{8,64}$/;

export const requestContextMiddleware: MiddlewareHandler = async (c, next) => {
  // Hono's built-in requestId() middleware has already run and set c.get("requestId")
  // We use that as the base, but also check for a client-provided X-Request-ID
  const clientRequestId = c.req.header("X-Request-ID");
  const honoRequestId = c.get("requestId") as string | undefined;

  let requestId: string;

  if (clientRequestId && SAFE_REQUEST_ID_REGEX.test(clientRequestId)) {
    // Reuse safe client-provided ID (lets frontend correlate its own logs)
    requestId = clientRequestId;
    // Override the Hono context as well
    c.set("requestId", requestId);
  } else {
    // Use Hono's auto-generated ID (already set by requestId() middleware in app.ts)
    requestId = honoRequestId ?? `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    c.set("requestId", requestId);
  }

  // Always return the requestId to the client — this is critical for
  // "Something went wrong. Reference ID: req_xxx" UX patterns
  c.header("X-Request-ID", requestId);

  // Run the rest of the request lifecycle inside AsyncLocalStorage context
  // This means ALL code downstream automatically has access to requestId,
  // principalId, role, and restaurantId without being passed explicitly
  return runWithLoggerContext({ requestId }, () => next());
};
