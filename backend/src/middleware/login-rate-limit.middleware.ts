import type { MiddlewareHandler } from "hono";
import { assertWithinRateLimit } from "../common/security/rate-limit/in-memory-rate-limit.js";

export const loginRateLimit: MiddlewareHandler = async (c, next) => {
  const ipAddress = c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown";
  assertWithinRateLimit({
    key: `login:${ipAddress}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
    message: "Too many login attempts. Please try again later.",
  });

  await next();
};
