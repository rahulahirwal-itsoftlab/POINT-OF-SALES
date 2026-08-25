import type { MiddlewareHandler } from "hono";
import { AppError } from "../common/errors/app-error.js";

export const resolveTenant: MiddlewareHandler = async (c, next) => {
  const user = c.get("user") as { organizationId?: string; organizationIds?: string[]; restaurantIds?: string[], role?: string } | undefined;
  
  if (user?.role === "SUPER_ADMIN") {
    return next();
  }

  const organizationId = user?.organizationId ?? user?.organizationIds?.[0];
  const restaurantId = user?.restaurantIds?.[0];
  
  if (!organizationId) {
    throw new AppError("Organization context missing", 403, "ORGANIZATION_MISSING");
  }

  if (!restaurantId) {
    throw new AppError("Restaurant context missing", 403, "RESTAURANT_MISSING");
  }

  c.set("organization", { id: organizationId });
  c.set("restaurant", { id: restaurantId });
  await next();
};
