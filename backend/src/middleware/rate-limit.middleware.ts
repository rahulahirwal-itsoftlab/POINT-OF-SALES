import type { MiddlewareHandler } from "hono";

export const rateLimit: MiddlewareHandler = async (_c, next) => {
  // TODO: Add IP/user-aware rate limiting.
  await next();
};
