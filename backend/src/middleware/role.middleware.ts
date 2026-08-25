import type { MiddlewareHandler } from "hono";
import { AppError } from "../common/errors/app-error.js";
import { Errors } from "../common/errors/error-codes.js";
import { logger } from "../common/logger/logger.js";
import { getLoggerContext } from "../common/logger/logger.context.js";

export const requireRole = (...roles: string[]): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user") as { role?: string; id?: string } | undefined;
    const context = getLoggerContext();

    if (!user) {
      throw Errors.unauthorized();
    }

    if (!user.role || !roles.includes(user.role)) {
      logger.warn(
        {
          requestId: context?.requestId,
          principalId: user.id,
          userRole: user.role,
          requiredRoles: roles,
          path: new URL(c.req.url).pathname,
          method: c.req.method,
        },
        `AUTHORIZATION_FAILED: Role ${user.role} is not in required roles [${roles.join(", ")}]`
      );
      throw new AppError(
        `Required role missing: needs one of [${roles.join(", ")}]`,
        403,
        "FORBIDDEN",
        undefined,
        "You do not have permission to perform this action."
      );
    }

    await next();
  };
};
