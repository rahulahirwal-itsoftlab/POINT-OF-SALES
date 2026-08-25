import type { MiddlewareHandler } from "hono";
import { AppError } from "../common/errors/app-error.js";
import { db } from "../config/database.js";
import { licenses, organizations, restaurants, subscriptions } from "../db/schema/index.js";
import { eq, desc } from "drizzle-orm";

export const requireActiveSubscription: MiddlewareHandler = async (c, next) => {
  const user = c.get("user") as { role?: string } | undefined;
  
  if (user?.role === "SUPER_ADMIN") {
    return next();
  }

  const restaurant = c.get("restaurant") as { id?: string } | undefined;
  const organization = c.get("organization") as { id?: string } | undefined;
  if (!organization?.id) {
    throw new AppError("Organization context missing for access validation", 403, "ORGANIZATION_MISSING");
  }

  if (!restaurant?.id) {
    throw new AppError("Restaurant context missing for license validation", 403, "RESTAURANT_MISSING");
  }

  const [organizationRow] = await db.select().from(organizations).where(eq(organizations.id, organization.id)).limit(1);
  if (!organizationRow || organizationRow.status !== "ACTIVE") {
    throw new AppError("Organization is not active", 403, "ORGANIZATION_INACTIVE");
  }

  const [restaurantRow] = await db.select().from(restaurants).where(eq(restaurants.id, restaurant.id)).limit(1);
  if (!restaurantRow || restaurantRow.organizationId !== organization.id || restaurantRow.status !== "ACTIVE") {
    throw new AppError("Restaurant is not active", 403, "RESTAURANT_INACTIVE");
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organization.id))
    .orderBy(desc(subscriptions.endDate))
    .limit(1);

  if (!subscription) {
    throw new AppError("No active subscription found for this organization", 403, "SUBSCRIPTION_MISSING");
  }

  const now = new Date();
  if (subscription.endDate <= now && subscription.status === "ACTIVE") {
    await db
      .update(subscriptions)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(subscriptions.id, subscription.id));
  }

  if (subscription.status !== "ACTIVE" || subscription.endDate <= now) {
    throw new AppError("Subscription is inactive or expired", 403, "SUBSCRIPTION_INACTIVE");
  }

  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.organizationId, organization.id))
    .orderBy(desc(licenses.expiresAt))
    .limit(1);

  if (!license) {
    throw new AppError("No license found for this restaurant", 403, "LICENSE_MISSING");
  }

  if (license.expiresAt <= now && license.status === "ACTIVE") {
    await db
      .update(licenses)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(licenses.id, license.id));
  }

  if (license.status === "EXPIRED") {
    throw new AppError("Your subscription has expired. Please contact the administrator.", 403, "LICENSE_EXPIRED");
  }

  if (license.status === "SUSPENDED") {
    throw new AppError("Your account access has been suspended.", 403, "LICENSE_SUSPENDED");
  }

  if (license.status === "BLOCKED") {
    throw new AppError("Your POS access has been blocked.", 403, "LICENSE_BLOCKED");
  }

  if (license.status === "REVOKED") {
    throw new AppError("Your license has been permanently revoked.", 403, "LICENSE_REVOKED");
  }

  if (license.status !== "ACTIVE") {
    throw new AppError("Your license is not active.", 403, "LICENSE_INACTIVE");
  }

  if (license.expiresAt <= now) {
    throw new AppError("Your subscription has expired. Please contact the administrator.", 403, "LICENSE_EXPIRED");
  }

  c.set("organization", organizationRow);
  c.set("subscription", subscription);
  c.set("license", license);
  await next();
};
