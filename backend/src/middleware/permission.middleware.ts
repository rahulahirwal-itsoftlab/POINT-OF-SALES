import type { MiddlewareHandler } from "hono";
import { assertHasPermission } from "../common/permissions/permission.helper.js";
import { Errors } from "../common/errors/error-codes.js";

export const requirePermission = (permission: string): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user") as { permissions?: string[]; role?: string } | undefined;
    if (!user) {
      throw Errors.unauthorized();
    }

    if (user.role !== "SUPER_ADMIN") {
      assertHasPermission(user.permissions ?? [], permission);
    }
    await next();
  };
};
